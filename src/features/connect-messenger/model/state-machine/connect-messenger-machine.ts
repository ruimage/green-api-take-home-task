import { assign, fromCallback, sendParent, setup } from "xstate";
import type { ActionArgs, AssignArgs, GuardArgs } from "xstate";

import {
  ActorEventPrefix,
  WorkflowRecovery,
  WorkflowStage,
} from "@/shared/lib/app-state/model/state-machine/app-constants";
import { toWorkflowError } from "@/shared/lib/app-state/model/state-machine/app-errors";
import {
  hasLiveSession,
  isCurrentFatalEvent,
} from "@/shared/lib/app-state/model/state-machine/app-guards";
import { createWorkflowContext } from "@/shared/lib/app-state/model/state-machine/workflow-context";
import type { AppWorkflowContext, WorkflowActorInput } from "@/shared/lib/app-state/model/types";

import type { ConnectionLifecycleInput } from "../types";
import type { ConnectMessengerEvent } from "../types";
import { validCredentials } from "../validate-credentials";
import { connectionActor } from "./connection-actor";
import { session } from "./session-vocabulary";

const canConnect = ({ context, event }: GuardArgs<AppWorkflowContext, ConnectMessengerEvent>) =>
  !!context.owner &&
  (context.canConnect?.() ?? true) &&
  event.type === session.event.CONNECT &&
  validCredentials(event.credentials);

const canRetryConnection = ({ context }: GuardArgs<AppWorkflowContext, ConnectMessengerEvent>) =>
  !!context.owner &&
  (context.canConnect?.() ?? true) &&
  context.error?.stage === WorkflowStage.CONNECTION &&
  context.error.recovery === WorkflowRecovery.RETRY &&
  validCredentials(context.input?.data.getCredentials() ?? null);

const runtimeLifecycleActor = fromCallback<ConnectMessengerEvent, ConnectionLifecycleInput>(
  ({ input, sendBack }) => {
    const { owner, parent } = input;
    const subscription = parent.subscribe({ error: () => owner?.stop() });
    if (owner?.resume()) sendBack({ type: session.event.DISCONNECT });
    return () => {
      subscription.unsubscribe();
      owner?.stop();
    };
  },
);

const saveCredentials = ({
  context,
  event,
}: ActionArgs<AppWorkflowContext, ConnectMessengerEvent, ConnectMessengerEvent>) => {
  if (event.type === session.event.CONNECT)
    context.input?.data.setCredentials({
      idInstance: event.credentials.idInstance.trim(),
      apiTokenInstance: event.credentials.apiTokenInstance.trim(),
    });
};

const endSession = ({
  context,
  event,
}: ActionArgs<AppWorkflowContext, ConnectMessengerEvent, ConnectMessengerEvent>) =>
  context.owner?.endSession(
    String(event.type) === `${ActorEventPrefix.ERROR}${session.actorId.CONNECTION}`,
  );

const beginAttempt = ({
  context,
}: AssignArgs<AppWorkflowContext, ConnectMessengerEvent, ConnectMessengerEvent, never>) => ({
  attemptId: context.owner?.beginAttempt() ?? 0,
  error: null,
  operation: null,
  submittedPhone: null,
});

const resetSession = ({
  context,
}: AssignArgs<AppWorkflowContext, ConnectMessengerEvent, ConnectMessengerEvent, never>) => {
  context.owner?.endSession();
  return {
    error: null,
    attemptId: 0,
    operation: null,
    submittedPhone: null,
  };
};

const clearError = () => ({ error: null });

const saveFatal = ({
  event,
}: AssignArgs<AppWorkflowContext, ConnectMessengerEvent, ConnectMessengerEvent, never>) => ({
  error:
    event.type === session.event.SESSION_FATAL
      ? toWorkflowError(event.error, WorkflowStage.CONNECTION)
      : null,
});

export const connectMessengerMachine = setup({
  types: {
    context: {} as AppWorkflowContext,
    input: {} as WorkflowActorInput | null,
    events: {} as ConnectMessengerEvent,
  },
  actors: {
    [session.actor.CONNECTION]: connectionActor,
    [session.actor.RUNTIME_LIFECYCLE]: runtimeLifecycleActor,
  },
  guards: {
    [session.guard.CAN_CONNECT]: canConnect,
    [session.guard.CAN_RETRY_CONNECTION]: canRetryConnection,
    [session.guard.CURRENT_FATAL]: isCurrentFatalEvent,
  },
  actions: {
    [session.action.SAVE_CREDENTIALS]: saveCredentials,
    [session.action.BEGIN_ATTEMPT]: assign(beginAttempt),
    [session.action.END_SESSION]: endSession,
    [session.action.RESET]: assign(resetSession),
    [session.action.CLEAR_ERROR]: assign(clearError),
    [session.action.SAVE_FATAL]: assign(saveFatal),
  },
}).createMachine({
  id: session.id,
  initial: session.state.IDLE,
  context: ({ input }) => createWorkflowContext(input),
  invoke: {
    id: session.actorId.RUNTIME_LIFECYCLE,
    src: session.actor.RUNTIME_LIFECYCLE,
    input: ({ context, self }) => ({ owner: context.owner, parent: self }),
  },
  on: {
    [session.event.DISCONNECT]: {
      target: session.target.IDLE,
      actions: session.action.RESET,
    },
    [session.event.WORKFLOW_FAILED]: {
      guard: hasLiveSession,
      target: session.target.FAILED,
      actions: assign({
        error: ({ event }) => (event.type === session.event.WORKFLOW_FAILED ? event.error : null),
      }),
    },
    [session.event.SESSION_FATAL]: {
      guard: session.guard.CURRENT_FATAL,
      target: session.target.FAILED,
      actions: session.action.SAVE_FATAL,
    },
  },
  states: {
    [session.state.IDLE]: {
      id: session.stateId.IDLE,
      entry: session.action.CLEAR_ERROR,
      on: {
        [session.event.CONNECT]: {
          guard: session.guard.CAN_CONNECT,
          target: session.target.CONNECTING,
          actions: session.action.SAVE_CREDENTIALS,
        },
      },
    },
    [session.state.FAILED]: {
      id: session.stateId.FAILED,
      on: {
        [session.event.CONNECT]: {
          guard: session.guard.CAN_CONNECT,
          target: session.target.CONNECTING,
          actions: session.action.SAVE_CREDENTIALS,
        },
        [session.event.RETRY]: {
          guard: session.guard.CAN_RETRY_CONNECTION,
          target: session.target.CONNECTING,
        },
      },
    },
    [session.state.CONNECTING]: {
      id: session.stateId.CONNECTING,
      entry: session.action.BEGIN_ATTEMPT,
      invoke: {
        id: session.actorId.CONNECTION,
        src: session.actor.CONNECTION,
        input: ({ context }) => {
          const credentials = context.input?.data.getCredentials();
          return context.owner && context.input && credentials
            ? {
                owner: context.owner,
                attemptId: context.attemptId,
                credentials,
                sessions: context.input.sessions,
              }
            : null;
        },
        onDone: {
          guard: ({ context, event }) =>
            !!context.owner?.isAttemptCurrent(event.output.attemptId) &&
            context.owner.getSession() === event.output.session,
          target: session.target.READY,
        },
        onError: {
          target: session.target.FAILED,
          actions: [
            assign({
              error: ({ event }) => toWorkflowError(event.error, WorkflowStage.CONNECTION),
            }),
            ({ context }) => context.owner?.endSession(true),
          ],
        },
      },
    },
    [session.state.READY]: {
      id: session.stateId.READY,
      entry: sendParent({ type: session.event.SESSION_READY }),
      exit: [session.action.END_SESSION, sendParent({ type: session.event.SESSION_ENDED })],
    },
  },
});
