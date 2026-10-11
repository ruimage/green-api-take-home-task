import type { ChatMessage } from "./types";

export const MessageDirection = {
  INCOMING: "incoming",
  OUTGOING: "outgoing",
} as const satisfies Record<string, ChatMessage["direction"]>;

export const MessageStatus = {
  SENDING: "sending",
  SENT: "sent",
  FAILED: "failed",
} as const satisfies Record<string, NonNullable<ChatMessage["status"]>>;
