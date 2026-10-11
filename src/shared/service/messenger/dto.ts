export const MessengerNotificationType = {
  MESSAGE: "message",
  UNSUPPORTED: "unsupported",
} as const;

export type MessengerCredentialsDto = {
  idInstance: string;
  apiTokenInstance: string;
};

export type ChatSummaryDto = {
  id: string;
  chatId: string;
  displayName: string;
};

export type ChatMessageDto = {
  id: string;
  chatId: string;
  direction: "incoming" | "outgoing";
  text: string;
  timestamp: number;
  status?: "sending" | "sent" | "failed";
};

export type MessengerNotificationDto =
  | { type: "message"; receiptId: string | number; message: ChatMessageDto }
  | { type: "unsupported"; receiptId: string | number };

export type SendMessageResultDto = { id: string };
