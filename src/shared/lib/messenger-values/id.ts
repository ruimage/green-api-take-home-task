import type { Brand } from "./brand";

export type MessengerId = Brand<string, "MessengerId">;

export function isMessengerId(value: unknown): value is MessengerId {
  return typeof value === "string" && value.trim().length > 0;
}

export function createMessengerId(value: unknown): MessengerId {
  if (!isMessengerId(value)) throw new TypeError("Invalid ID.");
  return value;
}
