import { expect, test } from "bun:test";

import {
  MessengerConnectionError,
  MessengerNetworkError,
  MessengerRateLimitError,
  MessengerUnauthorizedError,
  MessengerUnknownError,
} from "@/shared/service/messenger/errors";

import { GreenApiSdkMessengerService } from "../GreenApiSdkMessengerService";
import type { SdkFetch } from "../sdk-client";

const credentials = { idInstance: "9007199254740993123", apiTokenInstance: "synthetic-sdk-token" };
const chatId = "12345678901@c.us";
test("invalid connection options fail safely before allocating a session or making requests", () => {
  expect(() => new GreenApiSdkMessengerService({ ...credentials, idInstance: "0" })).toThrow(
    MessengerConnectionError,
  );
  expect(
    () =>
      new GreenApiSdkMessengerService(credentials, {
        apiUrl: "https://user:synthetic-secret@example.invalid",
      }),
  ).toThrow(MessengerConnectionError);
  expect(() => new GreenApiSdkMessengerService(credentials, { requestTimeoutMs: 0 })).toThrow(
    MessengerConnectionError,
  );
});
function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}
function setup(reply: (url: URL, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: URL; init: RequestInit }[] = [];
  const fetch: SdkFetch = async (url, init) => {
    const call = { url: new URL(url), init };
    calls.push(call);
    return reply(call.url, init);
  };
  return {
    calls,
    service: new GreenApiSdkMessengerService(credentials, {
      apiUrl: "https://example.invalid",
      fetch,
    }),
  };
}

test("SDK validation preserves exact instance precision", async () => {
  const { service, calls } = setup(() => response({ stateInstance: "authorized" }));
  await service.validateConnection();
  expect(calls[0]!.url.pathname).toContain(
    `/waInstance${credentials.idInstance}/getStateInstance/`,
  );
  service.dispose();
});

test("SDK send/phone/ack use documented methods and normalize DTOs", async () => {
  const { service, calls } = setup((url) => {
    if (url.pathname.includes("sendMessage")) return response({ idMessage: "server-id" });
    if (url.pathname.includes("checkWhatsapp")) return response({ existsWhatsapp: true });
    return response({ result: true });
  });
  expect(await service.sendMessage(chatId, "Текст")).toEqual({ id: "server-id" });
  expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ chatId, message: "Текст" });
  expect(await service.resolvePhoneChat("+12345678901")).toEqual({
    id: chatId,
    chatId,
    displayName: "+12345678901",
  });
  expect(JSON.parse(String(calls[1]!.init.body))).toEqual({ phoneNumber: 12345678901 });
  await service.acknowledgeNotification("9007199254740993124");
  expect(calls[2]!.init.method).toBe("DELETE");
  expect(calls[2]!.url.pathname.endsWith("/9007199254740993124")).toBe(true);
  service.dispose();
});

test.each(["notAuthorized", "blocked"])(
  "unauthorized account state rejects validation",
  async (stateInstance) => {
    const { service } = setup(() => response({ stateInstance }));
    await expect(service.validateConnection()).rejects.toBeInstanceOf(MessengerUnauthorizedError);
    service.dispose();
  },
);

test.each([401, 403, 429, 500, 400])(
  "HTTP errors are typed and do not include transport secrets",
  async (status) => {
    const { service, calls } = setup(() =>
      response({ error: `Raw URL: ${credentials.apiTokenInstance}` }, status),
    );
    let failure: unknown;
    try {
      await service.sendMessage(chatId, "private text");
    } catch (error) {
      failure = error;
    }
    const expected =
      status === 401 || status === 403
        ? MessengerUnauthorizedError
        : status === 429
          ? MessengerRateLimitError
          : status >= 500
            ? MessengerNetworkError
            : MessengerUnknownError;
    expect(failure).toBeInstanceOf(expected);
    expect(String(failure)).not.toContain(credentials.apiTokenInstance);
    expect(String(failure)).not.toContain("Raw URL");
    expect(calls).toHaveLength(1);
    service.dispose();
  },
);

test("network exceptions and invalid JSON are sanitized", async () => {
  const { service } = setup(() => {
    throw new Error(`https://example.invalid/${credentials.apiTokenInstance}`);
  });
  await expect(service.validateConnection()).rejects.toBeInstanceOf(MessengerNetworkError);
  service.dispose();
  const malformed = setup(() => new Response(`invalid ${credentials.apiTokenInstance}`));
  await expect(malformed.service.validateConnection()).rejects.toBeInstanceOf(
    MessengerUnknownError,
  );
  malformed.service.dispose();
});

test("signal cancellation and disposal abort in-flight calls and block new calls", async () => {
  const { service, calls } = setup(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal!.addEventListener("abort", () => reject(new Error("raw abort")), {
          once: true,
        });
      }),
  );
  const controller = new AbortController();
  const pending = service.validateConnection(controller.signal);
  controller.abort(new Error(credentials.apiTokenInstance));
  await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  expect(calls[0]!.init.signal!.aborted).toBe(true);
  const validation = service.validateConnection();
  service.dispose();
  await expect(validation).rejects.toMatchObject({ name: "AbortError" });
  await expect(service.validateConnection()).rejects.toMatchObject({ name: "AbortError" });
  await expect(service.receiveNotification()).rejects.toMatchObject({ name: "AbortError" });
  expect(calls).toHaveLength(2);
});

test("pre-aborted signal never reaches the transport", async () => {
  const { service, calls } = setup(() => response({ stateInstance: "authorized" }));
  const controller = new AbortController();
  controller.abort();
  await expect(service.validateConnection(controller.signal)).rejects.toMatchObject({
    name: "AbortError",
  });
  expect(calls).toHaveLength(0);
  service.dispose();
});

test("timeout physically aborts the request and returns a network error", async () => {
  let requestSignal: AbortSignal | null | undefined;
  const fetch: SdkFetch = (_url, init) =>
    new Promise((_resolve, reject) => {
      requestSignal = init.signal;
      requestSignal!.addEventListener("abort", () => reject(new Error("timeout with secrets")), {
        once: true,
      });
    });
  const service = new GreenApiSdkMessengerService(credentials, { fetch, requestTimeoutMs: 5 });
  await expect(service.validateConnection()).rejects.toBeInstanceOf(MessengerNetworkError);
  expect(requestSignal?.aborted).toBe(true);
  service.dispose();
});

test("empty receive response is null, malformed payload is an error and receive never acknowledges", async () => {
  const { service, calls } = setup(() => new Response(""));
  expect(await service.receiveNotification()).toBeNull();
  expect(calls).toHaveLength(1);
  expect(calls[0]!.url.pathname).toContain("receiveNotification");
  expect(calls[0]!.url.searchParams.get("receiveTimeout")).toBe("5");
  service.dispose();
  const malformed = setup(() => response(0));
  await expect(malformed.service.receiveNotification()).rejects.toBeInstanceOf(
    MessengerUnknownError,
  );
  malformed.service.dispose();
});

test("receives are physically serialized even if a cancelled transport completes late", async () => {
  const responses: ((value: Response) => void)[] = [];
  const { service, calls } = setup(() => new Promise((resolve) => responses.push(resolve)));
  const controller = new AbortController();
  const first = service.receiveNotification(controller.signal);
  const firstRejected = first.catch((error: unknown) => error);
  const second = service.receiveNotification();
  await Promise.resolve();
  expect(calls).toHaveLength(1);
  controller.abort();
  expect(calls[0]!.init.signal!.aborted).toBe(true);
  responses[0]!(response(null));
  expect(await firstRejected).toMatchObject({ name: "AbortError" });
  await Promise.resolve();
  expect(calls).toHaveLength(2);
  responses[1]!(response(null));
  expect(await second).toBeNull();
  service.dispose();
});
