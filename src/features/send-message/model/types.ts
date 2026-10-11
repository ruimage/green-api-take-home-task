import type { SnapshotFrom } from "xstate";

import type { AppSession } from "@/shared/lib/app-state/contracts/app-input";
import type { WorkflowEvent, SessionFatalEvent } from "@/shared/lib/app-state/model/types";
import type { AppRuntimeOwner } from "@/shared/lib/app-state/runtime/app-runtime";
import type { MessengerChatId } from "@/shared/lib/messenger-values/chat-id";
import type { MessengerId } from "@/shared/lib/messenger-values/id";

import type { conversation } from "./state-machine/conversation-vocabulary";
import type { messageSendingMachine } from "./state-machine/message-sending-machine";
import type { send } from "./state-machine/send-vocabulary";

export type SendMessageEvent =
  | Extract<
      WorkflowEvent,
      {
        type:
          | typeof conversation.event.ACTIVATE
          | typeof conversation.event.DEACTIVATE
          | typeof conversation.event.SEND_MESSAGE;
      }
    >
  | SessionFatalEvent
  | { type: typeof send.event.FINISHED; localId: string };

export type MessageSendingSnapshot = SnapshotFrom<typeof messageSendingMachine>;

export type SendMachineInput = Readonly<{
  owner: AppRuntimeOwner;
  session: AppSession;
  controller: AbortController;
  localId: MessengerId;
  chatId: MessengerChatId;
  text: string;
}>;
