import { expect, test } from "bun:test";

import { createMessengerTimestamp, isMessengerTimestamp } from "../timestamp";

test("messenger timestamps require nonnegative safe integer milliseconds", () => {
  for (const value of [0, 1, 1_700_000_000_000, Number.MAX_SAFE_INTEGER]) {
    expect(isMessengerTimestamp(value)).toBe(true);
    expect(value).toBe(createMessengerTimestamp(value));
  }
  for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "1000", null]) {
    expect(isMessengerTimestamp(value)).toBe(false);
    expect(() => createMessengerTimestamp(value)).toThrow(TypeError);
  }
});
