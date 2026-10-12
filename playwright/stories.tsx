import { useState } from "react";

import { App } from "@/app/App";
import { createAppRuntime } from "@/app/model/runtime/create-app-runtime";
import { createRestAppRuntime } from "@/app/model/runtime/create-rest-app-runtime";

export const Default = () => <App />;

export const WhatsAppConversation = () => <ConversationPreview adapter="sdk" />;

export function RestConnection({ apiUrl }: { apiUrl?: string }) {
  const [runtime] = useState(() =>
    createRestAppRuntime({
      apiUrl,
      fetch: async (url) => {
        if (new URL(url).origin !== "https://example.invalid") {
          throw new Error("Unexpected API URL");
        }
        return Response.json({ stateInstance: "notAuthorized" });
      },
    }),
  );
  return (
    <App
      input={runtime.input}
      store={runtime.store}
      initialCredentials={{ idInstance: "123456", apiTokenInstance: "preview-token" }}
    />
  );
}

export function ConnectionPending() {
  const [runtime] = useState(() =>
    createAppRuntime({
      adapter: "sdk",
      fetch: async (url, init) => {
        const endpoint = new URL(url).pathname.split("/")[2];
        if (endpoint !== "getStateInstance") throw new Error("Unexpected connection request");
        return new Promise<Response>((_, reject) => {
          const abort = () => reject(new DOMException("Aborted", "AbortError"));
          if (init.signal?.aborted) abort();
          else init.signal?.addEventListener("abort", abort, { once: true });
        });
      },
    }),
  );
  return <App input={runtime.input} store={runtime.store} />;
}

function ConversationPreview({ adapter }: { adapter: "sdk" | "rest" }) {
  const [runtime] = useState(() => {
    let pending: ((response: Response) => void) | undefined;
    let sequence = 0;
    const replies: Response[] = [];
    return createAppRuntime({
      adapter,
      fetch: async (url, init) => {
        const endpoint = new URL(url).pathname.split("/")[2];
        if (endpoint === "getStateInstance") return Response.json({ stateInstance: "authorized" });
        if (endpoint === "checkWhatsapp") return Response.json({ existsWhatsapp: true });
        if (endpoint === "sendMessage") {
          const id = ++sequence;
          const response = Response.json({
            receiptId: id,
            body: {
              typeWebhook: "incomingMessageReceived",
              idMessage: `reply-${id}`,
              timestamp: Math.floor(Date.now() / 1000),
              senderData: { chatId: "12345678901@c.us" },
              messageData: {
                typeMessage: "textMessage",
                textMessageData: { textMessage: "Привет! Сообщение получил." },
              },
            },
          });
          if (pending) {
            const resolve = pending;
            pending = undefined;
            resolve(response);
          } else replies.push(response);
          return Response.json({ idMessage: `sent-${id}` });
        }
        if (endpoint === "deleteNotification") return Response.json({ result: true });
        if (endpoint === "receiveNotification") {
          if (replies.length) return replies.shift()!;
          return new Promise<Response>((resolve, reject) => {
            pending = resolve;
            init.signal?.addEventListener(
              "abort",
              () => {
                pending = undefined;
                reject(new DOMException("Aborted", "AbortError"));
              },
              { once: true },
            );
          });
        }
        throw new Error("Unexpected preview request");
      },
    });
  });
  return (
    <App
      input={runtime.input}
      store={runtime.store}
      initialCredentials={{ idInstance: "123456", apiTokenInstance: "preview-token" }}
    />
  );
}
