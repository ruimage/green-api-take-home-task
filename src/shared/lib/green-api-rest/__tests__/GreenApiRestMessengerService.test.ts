import { expect, test } from "bun:test";

import {
  MessengerConnectionError,
  MessengerNetworkError,
  MessengerRateLimitError,
  MessengerUnauthorizedError,
  MessengerUnknownError,
} from "@/shared/service/messenger/errors";

import { GreenApiRestMessengerService } from "../GreenApiRestMessengerService";

const credentials = { idInstance: "9007199254740993123", apiTokenInstance: "synthetic/rest-token" };

test("REST serializes physical receives and returns null for an empty queue", async () => {
  const responses: ((value: Response) => void)[] = [];
  const service = new GreenApiRestMessengerService(credentials, {
    fetch: async (url) => {
      expect(new URL(url).searchParams.get("receiveTimeout")).toBe("5");
      return new Promise((resolve) => responses.push(resolve));
    },
  });
  const caller = new AbortController();
  const first = service.receiveNotification(caller.signal);
  const rejected = first.catch((error: unknown) => error);
  const second = service.receiveNotification();
  await Promise.resolve();
  expect(responses).toHaveLength(1);
  caller.abort();
  responses[0]!(Response.json(null));
  expect(await rejected).toMatchObject({ name: "AbortError" });
  await Promise.resolve();
  expect(responses).toHaveLength(2);
  responses[1]!(new Response(""));
  expect(await second).toBeNull();
  service.dispose();
});

test("REST sends exact text and preserves instance and receipt precision", async () => {
  const calls: { url: URL; init: RequestInit }[] = [];
  const service = new GreenApiRestMessengerService(credentials, {
    apiUrl: "https://example.invalid/",
    fetch: async (url, init) => {
      calls.push({ url: new URL(url), init });
      if (url.includes("getStateInstance")) return Response.json({ stateInstance: "authorized" });
      if (url.includes("sendMessage")) return Response.json({ idMessage: "sent-1" });
      return Response.json({ result: true });
    },
  });
  await service.validateConnection();
  expect(calls[0]!.url.pathname).toBe(
    `/waInstance${credentials.idInstance}/getStateInstance/synthetic%2Frest-token`,
  );
  expect(calls[0]!.init.method).toBe("GET");
  expect(await service.sendMessage("79991234567@c.us", "  hello\nworld  ")).toEqual({
    id: "sent-1",
  });
  expect(calls[1]!.init.method).toBe("POST");
  expect(JSON.parse(String(calls[1]!.init.body))).toEqual({
    chatId: "79991234567@c.us",
    message: "  hello\nworld  ",
  });
  expect(calls[1]!.init.credentials).toBe("omit");
  expect(calls[1]!.init.redirect).toBe("error");
  await service.acknowledgeNotification("9007199254740993124");
  expect(calls[2]!.init.method).toBe("DELETE");
  expect(calls[2]!.url.pathname.endsWith("/9007199254740993124")).toBe(true);
  service.dispose();
});

test("WhatsApp phone lookup uses checkWhatsapp and creates the personal chat ID", async () => {
  const service = new GreenApiRestMessengerService(credentials, {
    fetch: async (url, init) => {
      expect(url).toContain("/checkWhatsapp/");
      expect(JSON.parse(String(init.body))).toEqual({ phoneNumber: 79991234567 });
      return Response.json({ existsWhatsapp: true });
    },
  });
  expect(await service.resolvePhoneChat("+79991234567")).toEqual({
    id: "79991234567@c.us",
    chatId: "79991234567@c.us",
    displayName: "+79991234567",
  });
  await expect(service.resolvePhoneChat("invalid")).rejects.toBeInstanceOf(MessengerUnknownError);
  service.dispose();
});

test.each([401, 403, 429, 500, 400])("REST HTTP %i maps to a safe domain error", async (status) => {
  const service = new GreenApiRestMessengerService(credentials, {
    fetch: async () => new Response(credentials.apiTokenInstance, { status }),
  });
  const error = await service.validateConnection().catch((failure: unknown) => failure);
  const expected =
    status === 401 || status === 403
      ? MessengerUnauthorizedError
      : status === 429
        ? MessengerRateLimitError
        : status >= 500
          ? MessengerNetworkError
          : MessengerUnknownError;
  expect(error).toBeInstanceOf(expected);
  expect(String(error)).not.toContain(credentials.apiTokenInstance);
  service.dispose();
});

test("REST malformed notifications never acknowledge or hide payload errors", async () => {
  const methods: string[] = [];
  const service = new GreenApiRestMessengerService(credentials, {
    fetch: async (_url, init) => {
      methods.push(init.method!);
      return Response.json({ receiptId: 1, body: { typeWebhook: "incomingMessageReceived" } });
    },
  });
  await expect(service.receiveNotification()).rejects.toBeInstanceOf(MessengerUnknownError);
  expect(methods).toEqual(["GET"]);
  service.dispose();
});

test("REST cancellation, timeout and disposal abort pending requests", async () => {
  let requestSignal: AbortSignal | undefined;
  const service = new GreenApiRestMessengerService(credentials, {
    requestTimeoutMs: 20,
    fetch: async (_url, init) =>
      new Promise((_resolve, reject) => {
        requestSignal = init.signal!;
        requestSignal.addEventListener(
          "abort",
          () => reject(new Error(credentials.apiTokenInstance)),
          { once: true },
        );
      }),
  });
  const caller = new AbortController();
  const pending = service.sendMessage("79991234567@c.us", "private", caller.signal);
  caller.abort();
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(requestSignal?.aborted).toBe(true);
  await expect(service.validateConnection()).rejects.toBeInstanceOf(MessengerNetworkError);
  expect(requestSignal?.aborted).toBe(true);
  const receive = service.receiveNotification();
  await Promise.resolve();
  service.dispose();
  await expect(receive).rejects.toMatchObject({ name: "AbortError" });
  await expect(service.validateConnection()).rejects.toMatchObject({ name: "AbortError" });
});

test("REST validates credentials, host and timeout before any request", () => {
  expect(() => new GreenApiRestMessengerService({ ...credentials, idInstance: "0" })).toThrow(
    MessengerConnectionError,
  );
  expect(
    () =>
      new GreenApiRestMessengerService(credentials, {
        apiUrl: "https://user:pass@example.invalid",
      }),
  ).toThrow(MessengerConnectionError);
  expect(() => new GreenApiRestMessengerService(credentials, { requestTimeoutMs: 0 })).toThrow(
    MessengerConnectionError,
  );
});
