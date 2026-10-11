import { expect, test } from "bun:test";

import { createMessengerId, isMessengerId } from "../id";

test("opaque messenger IDs retain their exact representation", () => {
  for (const value of ["chat-A", "123@lid", "123@g.us", " opaque-id "]) {
    expect(isMessengerId(value)).toBe(true);
    expect(value).toBe(createMessengerId(value));
  }
  for (const value of ["", " \t", 123, null, undefined, {}]) {
    expect(isMessengerId(value)).toBe(false);
    expect(() => createMessengerId(value)).toThrow(TypeError);
  }
});
