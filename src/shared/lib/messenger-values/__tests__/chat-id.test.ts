import { expect, test } from "bun:test";

import { createMessengerChatId, isMessengerChatId } from "../chat-id";

test("opaque chat IDs retain their exact representation", () => {
  for (const value of ["chat-A", "123@lid", "123@g.us", " opaque-id "]) {
    expect(isMessengerChatId(value)).toBe(true);
    expect(value).toBe(createMessengerChatId(value));
  }
  for (const value of ["", " \t", 123, null, undefined, {}]) {
    expect(isMessengerChatId(value)).toBe(false);
    expect(() => createMessengerChatId(value)).toThrow(TypeError);
  }
});
