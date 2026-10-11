import { assign, sendParent, setup } from "xstate";
import type { ActionArgs, AssignArgs, GuardArgs } from "xstate";

import {
  WorkflowRecovery,
  WorkflowStage,
} from "@/shared/lib/app-state/model/state-machine/app-constants";
import { toWorkflowError } from "@/shared/lib/app-state/model/state-machine/app-errors";
import { AppProtocol } from "@/shared/lib/app-state/model/state-machine/app-protocol";
import { createWorkflowContext } from "@/shared/lib/app-state/model/state-machine/workflow-context";
import type { AppWorkflowContext, WorkflowActorInput } from "@/shared/lib/app-state/model/types";

import type { StartChatEvent } from "../types";
import { navigation } from "./navigation-vocabulary";
import { resolvePhoneChatActor } from "./start-chat-actor";

const isValidPhone = ({ event }: GuardArgs<AppWorkflowContext, StartChatEvent>) =>
  event.type === navigation.event.OPEN_CHAT && /^\+?[1-9]\d{9,14}$/.test(event.phone.trim());

const beginOperation = ({
  context,
}: AssignArgs<AppWorkflowContext, StartChatEvent, StartChatEvent, never>) => ({
  operation: context.owner?.getSession() ? context.owner.nextOperation() : null,
  error: null,
});

const invalidateOperation = ({
  context,
}: ActionArgs<AppWorkflowContext, StartChatEvent, StartChatEvent>) =>
  context.owner?.invalidateOperation();

const savePhone = ({
  event,
}: AssignArgs<AppWorkflowContext, StartChatEvent, StartChatEvent, never>) => ({
  submittedPhone: event.type === navigation.event.OPEN_CHAT ? event.phone.trim() : null,
});

const resetWorkflow = () => ({
  error: null,
  operation: null,
  submittedPhone: null,
});

export const startChatMachine = setup({
  types: {
    context: {} as AppWorkflowContext,
    input: {} as WorkflowActorInput | null,
    events: {} as StartChatEvent,
  },
  actors: { [navigation.actor.RESOLVE_PHONE_CHAT]: resolvePhoneChatActor },
  guards: {
    [navigation.guard.VALID_PHONE]: isValidPhone,
  },
  actions: {
    [navigation.action.BEGIN_OPERATION]: assign(beginOperation),
    [navigation.action.INVALIDATE_OPERATION]: invalidateOperation,
    [navigation.action.SAVE_PHONE]: assign(savePhone),
    [navigation.action.RESET_WORKFLOW]: assign(resetWorkflow),
  },
}).createMachine({
  id: navigation.id,
  initial: navigation.state.IDLE,
  context: ({ input }) => createWorkflowContext(input),
  on: {
    [navigation.event.ACTIVATE]: {
      target: navigation.target.EDITING,
      actions: navigation.action.RESET_WORKFLOW,
    },
    [navigation.event.DEACTIVATE]: {
      target: navigation.target.IDLE,
      actions: navigation.action.RESET_WORKFLOW,
    },
  },
  states: {
    [navigation.state.IDLE]: { id: navigation.stateId.IDLE },
    [navigation.state.EDITING]: {
      id: navigation.stateId.EDITING,
      on: {
        [navigation.event.OPEN_CHAT]: {
          guard: navigation.guard.VALID_PHONE,
          target: navigation.target.RESOLVING,
          actions: navigation.action.SAVE_PHONE,
        },
      },
    },
    [navigation.state.RESOLVING]: {
      id: navigation.stateId.RESOLVING,
      entry: navigation.action.BEGIN_OPERATION,
      exit: navigation.action.INVALIDATE_OPERATION,
      invoke: {
        id: navigation.actorId.PHONE,
        src: navigation.actor.RESOLVE_PHONE_CHAT,
        input: ({ context }) => {
          const session = context.owner?.getSession();
          return context.owner && context.operation && session && context.submittedPhone
            ? {
                owner: context.owner,
                key: context.operation,
                session,
                phone: context.submittedPhone,
              }
            : null;
        },
        onDone: {
          guard: ({ context, event }) => !!context.owner?.isCurrent(event.output.key),
          target: navigation.target.CONVERSATION,
          actions: ({ context, event }) => context.input?.data.setActiveChat(event.output.value),
        },
        onError: [
          {
            guard: ({ event }) =>
              toWorkflowError(event.error, WorkflowStage.PHONE).recovery ===
              WorkflowRecovery.RECONNECT_SESSION,
            target: navigation.target.EDITING,
            actions: [
              assign({
                error: ({ event }) => toWorkflowError(event.error, WorkflowStage.PHONE),
              }),
              sendParent(({ event }) => ({
                type: AppProtocol.event.WORKFLOW_FAILED,
                error: toWorkflowError(event.error, WorkflowStage.PHONE),
              })),
            ],
          },
          {
            target: navigation.target.EDITING,
            actions: assign({
              error: ({ event }) => toWorkflowError(event.error, WorkflowStage.PHONE),
            }),
          },
        ],
      },
    },
    [navigation.state.CONVERSATION]: {
      id: navigation.stateId.CONVERSATION,
      entry: sendParent({ type: AppProtocol.event.CHAT_OPENED }),
      exit: sendParent({ type: AppProtocol.event.CHAT_CLOSED }),
    },
  },
});
