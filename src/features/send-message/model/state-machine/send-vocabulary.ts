import { AppProtocol } from "@/shared/lib/app-state/model/state-machine/app-protocol";

export const send = {
  id: "sendMessage",
  state: {
    SENDING: "sending",
    SENT: "sent",
    FAILED: "failed",
    CANCELLED: "cancelled",
  },
  event: {
    FINISHED: "SEND_FINISHED",
    SESSION_FATAL: AppProtocol.event.SESSION_FATAL,
  },
  actor: {
    REQUEST: "sendRequest",
  },
  CHILD_ID_PREFIX: "local-message:",
} as const;
