import type { Brand } from "./brand";
import { isMessengerId } from "./id";

export type MessengerChatId = Brand<string, "MessengerChatId">;

export function isMessengerChatId(value: unknown): value is MessengerChatId {
  return isMessengerId(value);
}

export function createMessengerChatId(value: unknown): MessengerChatId {
  if (!isMessengerChatId(value)) throw new TypeError("Invalid chat ID.");
  return value;
}
