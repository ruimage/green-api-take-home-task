import { afterEach, expect, test } from "bun:test";

import { parseDevConnectionConfig, readDevConnectionConfig } from "../dev-connection";

const keys = [
  "NODE_ENV",
  "BUN_PUBLIC_GREEN_API_ID_INSTANCE",
  "BUN_PUBLIC_GREEN_API_API_TOKEN_INSTANCE",
  "BUN_PUBLIC_GREEN_API_API_URL",
] as const;
const previous = new Map(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of keys) {
    const value = previous.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test("dev config returns DTO credentials and a normalized API URL", () => {
  expect(
    parseDevConnectionConfig({
      idInstance: " 123456 ",
      apiTokenInstance: " stub-token ",
      apiUrl: " https://example.invalid/ ",
    }),
  ).toEqual({
    credentials: { idInstance: "123456", apiTokenInstance: "stub-token" },
    apiUrl: "https://example.invalid",
  });
});

test.each([undefined, "", "  "])("missing API URL remains available for manual entry", (apiUrl) => {
  expect(
    parseDevConnectionConfig({ idInstance: "123456", apiTokenInstance: "stub-token", apiUrl })
      .apiUrl,
  ).toBeUndefined();
});

test.each([
  { idInstance: "", apiTokenInstance: "stub-token" },
  { idInstance: "123456", apiTokenInstance: "  " },
  {},
])("missing credentials produce an actionable error", (values) => {
  expect(() => parseDevConnectionConfig(values)).toThrow("Заполните");
});

test.each([
  "not-a-url",
  "/relative",
  "ftp://example.invalid",
  "https://user:stub-secret@example.invalid",
  "https://example.invalid?token=stub-secret",
  "https://example.invalid#stub-secret",
])("invalid API URL never exposes connection values in the error", (apiUrl) => {
  let error: unknown;
  try {
    parseDevConnectionConfig({ idInstance: "123456", apiTokenInstance: "stub-token", apiUrl });
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(Error);
  const message = (error as Error).message;
  expect(message).not.toContain("stub-token");
  expect(message).not.toContain("stub-secret");
  expect(message).not.toContain("123456");
});

test.each(["test", "production"])("non-development runtime does not read credentials", (mode) => {
  process.env.NODE_ENV = mode;
  delete process.env.BUN_PUBLIC_GREEN_API_ID_INSTANCE;
  delete process.env.BUN_PUBLIC_GREEN_API_API_TOKEN_INSTANCE;
  expect(readDevConnectionConfig()).toBeNull();
});

test("development runtime reads its explicit environment values", () => {
  process.env.NODE_ENV = "development";
  process.env.BUN_PUBLIC_GREEN_API_ID_INSTANCE = "123456";
  process.env.BUN_PUBLIC_GREEN_API_API_TOKEN_INSTANCE = "stub-token";
  process.env.BUN_PUBLIC_GREEN_API_API_URL = "https://example.invalid";
  expect(readDevConnectionConfig()).toEqual({
    credentials: { idInstance: "123456", apiTokenInstance: "stub-token" },
    apiUrl: "https://example.invalid",
  });
});

test("development runtime without credentials leaves the form empty", () => {
  process.env.NODE_ENV = "development";
  process.env.BUN_PUBLIC_GREEN_API_ID_INSTANCE = "";
  process.env.BUN_PUBLIC_GREEN_API_API_TOKEN_INSTANCE = "";
  process.env.BUN_PUBLIC_GREEN_API_API_URL = "";
  expect(readDevConnectionConfig()).toBeNull();
});

test("development runtime can configure API URL without prefilled credentials", () => {
  process.env.NODE_ENV = "development";
  process.env.BUN_PUBLIC_GREEN_API_ID_INSTANCE = "";
  process.env.BUN_PUBLIC_GREEN_API_API_TOKEN_INSTANCE = "";
  process.env.BUN_PUBLIC_GREEN_API_API_URL = "https://example.invalid/";
  expect(readDevConnectionConfig()).toEqual({
    credentials: undefined,
    apiUrl: "https://example.invalid",
  });
});
