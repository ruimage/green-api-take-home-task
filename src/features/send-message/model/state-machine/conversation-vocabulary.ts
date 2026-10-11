import { AppProtocol } from "@/shared/lib/app-state/model/state-machine/app-protocol";

import { send } from "./send-vocabulary";

export const conversation = {
  id: "chatConversation",
  state: {
    IDLE: "idle",
    CONVERSATION: "conversation",
  },
  stateId: {
    IDLE: "conversationIdle",
    CONVERSATION: "conversation",
  },
  target: {
    IDLE: "#conversationIdle",
    CONVERSATION: "#conversation",
  },
  event: {
    SEND_MESSAGE: "SEND_MESSAGE",
    FINISHED: send.event.FINISHED,
    ACTIVATE: AppProtocol.event.ACTIVATE,
    DEACTIVATE: AppProtocol.event.DEACTIVATE,
    SESSION_FATAL: AppProtocol.event.SESSION_FATAL,
  },
  actor: {
    SEND: send.id,
  },
  action: {
    START_SEND: "startSend",
    CANCEL_SENDS: "cancelSessionSends",
  },
  guard: {
    CAN_SEND: "canSend",
  },
} as const;
