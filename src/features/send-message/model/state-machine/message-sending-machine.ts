import { enqueueActions, sendParent, setup, stopChild } from "xstate";
import type { GuardArgs } from "xstate";

import { MessageDirection, MessageStatus } from "@/entities/chat";
import { isCurrentFatalEvent } from "@/shared/lib/app-state/model/state-machine/app-guards";
import { createWorkflowContext } from "@/shared/lib/app-state/model/state-machine/workflow-context";
import type { AppWorkflowContext, WorkflowActorInput } from "@/shared/lib/app-state/model/types";
import { createMessengerChatId } from "@/shared/lib/messenger-values/chat-id";
import { createMessengerId } from "@/shared/lib/messenger-values/id";

import type { SendMessageEvent } from "../types";
import { conversation } from "./conversation-vocabulary";
import { sendMachine } from "./send-machine";
import { send } from "./send-vocabulary";

const canSend = ({ context }: GuardArgs<AppWorkflowContext, SendMessageEvent>) =>
  !!context.owner?.getSession() &&
  !!context.input?.data.getActiveChat() &&
  !!context.input.data.getDraft().trim();

export const messageSendingMachine = setup({
  types: {
    context: {} as AppWorkflowContext,
    input: {} as WorkflowActorInput | null,
    events: {} as SendMessageEvent,
  },
  actors: {
    [conversation.actor.SEND]: sendMachine,
  },
  guards: {
    [conversation.guard.CAN_SEND]: canSend,
  },
  actions: {
    [conversation.action.START_SEND]: enqueueActions(({ context, enqueue }) => {
      const owner = context.owner!;
      const session = owner.getSession()!;
      const data = context.input!.data;
      const chatId = createMessengerChatId(data.getActiveChat()!.chatId);
      const text = data.getDraft();
      const localId = createMessengerId(`${send.CHILD_ID_PREFIX}${crypto.randomUUID()}`);
      const controller = new AbortController();
      owner.registerSend(localId, controller);
      data.upsertMessage({
        id: localId,
        chatId,
        text,
        timestamp: Date.now(),
        direction: MessageDirection.OUTGOING,
        status: MessageStatus.SENDING,
      });
      data.setDraft("");
      enqueue.spawnChild(conversation.actor.SEND, {
        id: localId,
        input: { owner, session, controller, localId, chatId, text },
      });
    }),
    [conversation.action.CANCEL_SENDS]: enqueueActions(({ context, self, enqueue }) => {
      if (context.owner?.getSession()) return;
      for (const id of Object.keys(self.getSnapshot().children)) {
        if (id.startsWith(send.CHILD_ID_PREFIX)) enqueue.stopChild(id);
      }
    }),
  },
}).createMachine({
  id: conversation.id,
  initial: conversation.state.IDLE,
  context: ({ input }) => createWorkflowContext(input),
  on: {
    [conversation.event.ACTIVATE]: {
      target: conversation.target.CONVERSATION,
      reenter: true,
    },
    [conversation.event.DEACTIVATE]: {
      target: conversation.target.IDLE,
      actions: conversation.action.CANCEL_SENDS,
    },
    [conversation.event.FINISHED]: {
      actions: [
        ({ context, event }) => context.owner?.finishSend(event.localId),
        stopChild(({ event }) => event.localId),
      ],
    },
    [conversation.event.SESSION_FATAL]: {
      guard: isCurrentFatalEvent,
      actions: sendParent(({ event }) => event),
    },
  },
  states: {
    [conversation.state.IDLE]: { id: conversation.stateId.IDLE },
    [conversation.state.CONVERSATION]: {
      id: conversation.stateId.CONVERSATION,
      on: {
        [conversation.event.SEND_MESSAGE]: {
          guard: conversation.guard.CAN_SEND,
          actions: conversation.action.START_SEND,
        },
      },
    },
  },
});
