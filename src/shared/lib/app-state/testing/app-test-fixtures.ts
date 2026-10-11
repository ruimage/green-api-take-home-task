import type {
  ChatMessageDto,
  ChatSummaryDto,
  MessengerCredentialsDto,
  MessengerNotificationDto,
  SendMessageResultDto,
} from "@/shared/service/messenger/dto";
import type { MessengerService } from "@/shared/service/messenger/MessengerService";

import type { AppDataBridge, AppSession, AppSessionFactory } from "../contracts/app-input";
export const TEST_CREDENTIALS: MessengerCredentialsDto = {
  idInstance: "123456",
  apiTokenInstance: "unit-test-token",
};
export const TEST_MANUAL_CHAT: ChatSummaryDto = {
  id: "12345678901@c.us",
  chatId: "12345678901@c.us",
  displayName: "+12345678901",
};
export type ControlledRequest<T> = {
  promise: Promise<T>;
  signal?: AbortSignal;
  resolve(value: T): void;
  reject(error: unknown): void;
};
function request<T>(signal?: AbortSignal): ControlledRequest<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, signal, resolve, reject };
}
export function createControlledMessenger() {
  const calls = {
    connection: [] as ControlledRequest<void>[],
    phone: [] as (ControlledRequest<ChatSummaryDto> & { phone: string })[],
    send: [] as (ControlledRequest<SendMessageResultDto> & { chatId: string; text: string })[],
    receive: [] as ControlledRequest<MessengerNotificationDto | null>[],
    acknowledge: [] as (ControlledRequest<void> & { receiptId: string | number })[],
  };
  const messenger: MessengerService = {
    validateConnection(signal) {
      const call = request<void>(signal);
      calls.connection.push(call);
      return call.promise;
    },
    resolvePhoneChat(phone, signal) {
      const call = { ...request<ChatSummaryDto>(signal), phone };
      calls.phone.push(call);
      return call.promise;
    },
    sendMessage(chatId, text, signal) {
      const call = { ...request<SendMessageResultDto>(signal), chatId, text };
      calls.send.push(call);
      return call.promise;
    },
    receiveNotification(signal) {
      const call = request<MessengerNotificationDto | null>(signal);
      calls.receive.push(call);
      return call.promise;
    },
    acknowledgeNotification(receiptId, signal) {
      const call = { ...request<void>(signal), receiptId };
      calls.acknowledge.push(call);
      return call.promise;
    },
  };
  return { messenger, calls };
}
export function createDataFixture() {
  const state = {
    credentials: null as MessengerCredentialsDto | null,
    activeChat: null as ChatSummaryDto | null,
    draft: "",
    clearCount: 0,
    messages: [] as ChatMessageDto[],
  };
  const data: AppDataBridge = {
    getCredentials: () => state.credentials,
    setCredentials: (value) => {
      state.credentials = value;
    },
    getActiveChat: () => state.activeChat,
    setActiveChat: (value) => {
      state.activeChat = value;
      state.messages = [];
      state.draft = "";
    },
    upsertMessage: (value) => {
      if (value.chatId !== state.activeChat?.chatId) return;
      const items = new Map(state.messages.map((message) => [message.id, message]));
      items.set(value.id, value);
      state.messages = [...items.values()];
    },
    markSent: (chatId, localId, serverId) => {
      state.messages = state.messages.map((item) =>
        item.chatId === chatId && item.id === localId
          ? { ...item, id: serverId, status: "sent" }
          : item,
      );
    },
    markFailed: (chatId, localId) => {
      state.messages = state.messages.map((item) =>
        item.chatId === chatId && item.id === localId ? { ...item, status: "failed" } : item,
      );
    },
    getDraft: () => state.draft,
    setDraft: (value) => {
      state.draft = value;
    },
    clearSession: () => {
      state.credentials = null;
      state.activeChat = null;
      state.draft = "";
      state.messages = [];
      state.clearCount++;
    },
  };
  return { data, state };
}
export function createSessionFixture() {
  const sessions: (AppSession & {
    control: ReturnType<typeof createControlledMessenger>;
    credentials: MessengerCredentialsDto;
    disposeCount: number;
  })[] = [];
  let nextFactoryError: unknown;
  const factory: AppSessionFactory = {
    create(credentials) {
      if (nextFactoryError !== undefined) {
        const error = nextFactoryError;
        nextFactoryError = undefined;
        throw error;
      }
      const control = createControlledMessenger();
      const session = {
        id: `unit-session-${sessions.length + 1}`,
        dependencies: { messenger: control.messenger },
        control,
        credentials,
        disposeCount: 0,
        dispose() {
          session.disposeCount++;
        },
      };
      sessions.push(session);
      return session;
    },
  };
  return {
    factory,
    sessions,
    failNextCreation(error: unknown) {
      nextFactoryError = error;
    },
  };
}
export function lastRequest<T>(calls: T[]): T {
  const call = calls.at(-1);
  if (!call) throw new Error("Expected a controlled request to have started.");
  return call;
}
export async function settleActors() {
  for (let turn = 0; turn < 16; turn++) await Promise.resolve();
}
export function historyMessage(chatId: string, id = "message-1"): ChatMessageDto {
  return { id, chatId, direction: "incoming", text: "Unit message", timestamp: 1000 };
}
