import type { Brand } from "./brand";

export type MessengerTimestamp = Brand<number, "MessengerTimestamp">;

export function isMessengerTimestamp(value: unknown): value is MessengerTimestamp {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function createMessengerTimestamp(value: unknown): MessengerTimestamp {
  if (!isMessengerTimestamp(value)) throw new TypeError("Invalid timestamp.");
  return value;
}
