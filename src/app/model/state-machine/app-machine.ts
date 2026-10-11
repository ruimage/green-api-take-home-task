import { sendTo, setup } from "xstate";

import type { AppRootEvent } from "@/app/model/types";
import { connectMessengerMachine } from "@/features/connect-messenger";
import { session } from "@/features/connect-messenger";
import { receiveMessagesMachine } from "@/features/receive-messages";
import { messageSendingMachine } from "@/features/send-message";
import { conversation } from "@/features/send-message";
import { startChatMachine } from "@/features/start-chat";
import { ActorEventPrefix } from "@/shared/lib/app-state/model/state-machine/app-constants";
import { AppProtocol } from "@/shared/lib/app-state/model/state-machine/app-protocol";
import { createWorkflowContext } from "@/shared/lib/app-state/model/state-machine/workflow-context";
import type { AppWorkflowContext, WorkflowActorInput } from "@/shared/lib/app-state/model/types";

import { app } from "./app-vocabulary";

export const appMachine = setup({
  types: {
    context: {} as AppWorkflowContext,
    input: {} as WorkflowActorInput | null,
    events: {} as AppRootEvent,
  },
  actors: {
    [app.actor.SESSION]: connectMessengerMachine,
    [app.actor.NAVIGATION]: startChatMachine,
    [app.actor.CONVERSATION]: messageSendingMachine,
    [app.actor.NOTIFICATIONS]: receiveMessagesMachine,
  },
}).createMachine({
  id: app.id,
  initial: app.state.COLLAPSED,
  context: ({ input }) => createWorkflowContext(input),
  states: {
    [app.state.COLLAPSED]: {
      id: app.stateId.COLLAPSED,
      on: { [app.event.OPEN]: app.target.OPENED },
    },
    [app.state.OPENED]: {
      id: app.stateId.OPENED,
      initial: app.state.GUEST,
      on: {
        [app.event.CLOSE]: app.target.COLLAPSED,
        [`${ActorEventPrefix.ERROR}${app.child.SESSION}`]: app.target.GUEST,
      },
      invoke: {
        id: app.child.SESSION,
        src: app.actor.SESSION,
        input: ({ context }) => ({
          dependencies: context.input,
          owner: context.owner,
          canConnect: context.canConnect,
        }),
      },
      states: {
        [app.state.GUEST]: {
          id: app.stateId.GUEST,
          on: { [AppProtocol.event.SESSION_READY]: app.target.WORKFLOW },
        },
        [app.state.WORKFLOW]: {
          id: app.stateId.WORKFLOW,
          initial: app.state.CHATLESS,
          entry: sendTo(app.child.NAVIGATION, { type: AppProtocol.event.ACTIVATE }),
          invoke: [
            {
              id: app.child.NAVIGATION,
              src: app.actor.NAVIGATION,
              input: ({ context }) => ({
                dependencies: context.input,
                owner: context.owner,
                canConnect: context.canConnect,
              }),
            },
            {
              id: app.child.CONVERSATION,
              src: app.actor.CONVERSATION,
              input: ({ context }) => ({
                dependencies: context.input,
                owner: context.owner,
                canConnect: context.canConnect,
              }),
            },
          ],
          on: {
            [AppProtocol.event.SESSION_ENDED]: app.target.GUEST,
            [AppProtocol.event.SESSION_FATAL]: {
              actions: sendTo(app.child.SESSION, ({ event }) => event),
            },
            [AppProtocol.event.WORKFLOW_FAILED]: {
              actions: sendTo(app.child.SESSION, ({ event }) => event),
            },
            [`${ActorEventPrefix.ERROR}${app.child.NAVIGATION}`]: {
              actions: sendTo(app.child.SESSION, { type: session.event.DISCONNECT }),
            },
            [`${ActorEventPrefix.ERROR}${app.child.CONVERSATION}`]: {
              actions: sendTo(app.child.SESSION, { type: session.event.DISCONNECT }),
            },
            [`${ActorEventPrefix.ERROR}${app.child.NOTIFICATIONS}`]: {
              actions: sendTo(app.child.SESSION, { type: session.event.DISCONNECT }),
            },
          },
          states: {
            [app.state.CHATLESS]: {
              id: app.stateId.CHATLESS,
              on: { [AppProtocol.event.CHAT_OPENED]: app.target.CHAT },
            },
            [app.state.CHAT]: {
              id: app.stateId.CHAT,
              entry: sendTo(app.child.CONVERSATION, {
                type: conversation.event.ACTIVATE,
              }),
              exit: sendTo(app.child.CONVERSATION, {
                type: conversation.event.DEACTIVATE,
              }),
              invoke: {
                id: app.child.NOTIFICATIONS,
                src: app.actor.NOTIFICATIONS,
                input: ({ context }) => ({ owner: context.owner }),
              },
              on: {
                [AppProtocol.event.CHAT_CLOSED]: app.target.CHATLESS,
              },
            },
          },
        },
      },
    },
  },
});
