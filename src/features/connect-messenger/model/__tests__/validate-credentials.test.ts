import { expect, test } from "bun:test";

import { validCredentials, validateCredentials } from "../validate-credentials";

test("credentials require a numeric instance and a nonblank token", () => {
  expect(validCredentials(null)).toBe(false);
  expect(validCredentials({ idInstance: " ", apiTokenInstance: " " })).toBe(false);
  expect(validCredentials({ idInstance: "123abc", apiTokenInstance: "token" })).toBe(false);
  expect(validCredentials({ idInstance: "123", apiTokenInstance: "\n\t" })).toBe(false);
  const credentials = { idInstance: " 123 ", apiTokenInstance: " AbC_token " };
  expect(validCredentials(credentials)).toBe(true);
  expect(validateCredentials(credentials)).toEqual({ idInstance: null, apiTokenInstance: null });
  expect(credentials).toEqual({ idInstance: " 123 ", apiTokenInstance: " AbC_token " });
});
