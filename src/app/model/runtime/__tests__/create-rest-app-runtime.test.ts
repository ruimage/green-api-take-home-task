import { expect, test } from "bun:test";

import { apiUrlDraftAtom, configuredApiUrlAtom } from "@/features/connect-messenger";

import { createRestAppRuntime } from "../create-rest-app-runtime";

test.each([undefined, "", "  "])(
  "manual API URL is read when creating a session",
  async (apiUrl) => {
    const requested: string[] = [];
    const runtime = createRestAppRuntime({
      apiUrl,
      fetch: async (url) => {
        requested.push(String(url));
        return Response.json({ stateInstance: "authorized" });
      },
    });
    expect(runtime.store.get(configuredApiUrlAtom)).toBeUndefined();
    runtime.store.set(apiUrlDraftAtom, " https://example.invalid/ ");
    const session = runtime.input.sessions.create({
      idInstance: "123456",
      apiTokenInstance: "stub-token",
    });
    try {
      await session.dependencies.messenger.validateConnection(new AbortController().signal);
      expect(requested).toEqual([
        "https://example.invalid/waInstance123456/getStateInstance/stub-token",
      ]);
    } finally {
      session.dispose();
    }
  },
);

test("configured API URL takes precedence over a manual draft", async () => {
  const requested: string[] = [];
  const runtime = createRestAppRuntime({
    apiUrl: "https://configured.invalid",
    fetch: async (url) => {
      requested.push(String(url));
      return Response.json({ stateInstance: "authorized" });
    },
  });
  runtime.store.set(apiUrlDraftAtom, "https://example.invalid");
  const session = runtime.input.sessions.create({
    idInstance: "123456",
    apiTokenInstance: "stub-token",
  });
  try {
    await session.dependencies.messenger.validateConnection(new AbortController().signal);
    expect(requested).toEqual([
      "https://configured.invalid/waInstance123456/getStateInstance/stub-token",
    ]);
  } finally {
    session.dispose();
  }
});
