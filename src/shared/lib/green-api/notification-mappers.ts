import {
  MessengerNotificationType,
  type MessengerNotificationDto,
} from "@/shared/service/messenger/dto";
import { MessengerUnknownError } from "@/shared/service/messenger/errors";

const MessageType = { TEXT: "textMessage", EXTENDED: "extendedTextMessage" } as const;
const WebhookType = {
  INCOMING: "incomingMessageReceived",
  OUTGOING: "outgoingMessageReceived",
  API_OUTGOING: "outgoingAPIMessageReceived",
} as const;

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new MessengerUnknownError();
  return value as Record<string, unknown>;
}
export function requiredString(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new MessengerUnknownError();
  return value;
}
function milliseconds(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(value * 1000)
  )
    throw new MessengerUnknownError();
  return value * 1000;
}
export function mapNotification(value: unknown): MessengerNotificationDto | null {
  if (value === null) return null;
  const item = record(value);
  const receiptId = item.receiptId;
  if (
    !(typeof receiptId === "number" && Number.isSafeInteger(receiptId) && receiptId > 0) &&
    !(typeof receiptId === "string" && /^\d+$/.test(receiptId) && BigInt(receiptId) > 0n)
  )
    throw new MessengerUnknownError();
  const body = record(item.body);
  requiredString(body.typeWebhook);
  if (
    body.typeWebhook !== WebhookType.INCOMING &&
    body.typeWebhook !== WebhookType.OUTGOING &&
    body.typeWebhook !== WebhookType.API_OUTGOING
  )
    return { type: MessengerNotificationType.UNSUPPORTED, receiptId };
  const data = record(body.messageData);
  requiredString(data.typeMessage);
  if (data.typeMessage !== MessageType.TEXT && data.typeMessage !== MessageType.EXTENDED)
    return { type: MessengerNotificationType.UNSUPPORTED, receiptId };
  const sender = record(body.senderData);
  const chatId = requiredString(sender.chatId);
  if (chatId.endsWith("@g.us")) return { type: MessengerNotificationType.UNSUPPORTED, receiptId };
  const textData = record(
    data.typeMessage === MessageType.TEXT ? data.textMessageData : data.extendedTextMessageData,
  );
  const text = data.typeMessage === MessageType.TEXT ? textData.textMessage : textData.text;
  if (typeof text !== "string") throw new MessengerUnknownError();
  return {
    type: MessengerNotificationType.MESSAGE,
    receiptId,
    message: {
      id: requiredString(body.idMessage),
      chatId,
      direction: body.typeWebhook === WebhookType.INCOMING ? "incoming" : "outgoing",
      text,
      timestamp: milliseconds(body.timestamp),
    },
  };
}
