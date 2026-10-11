import { expect, test } from "bun:test";

import { messagesAtom } from "@/entities/chat";
import { connectionDraftAtom } from "@/features/connect-messenger";
import {
  TEST_MANUAL_CHAT,
  TEST_CREDENTIALS,
  historyMessage,
} from "@/shared/lib/app-state/testing/app-test-fixtures";

import { createAppRuntime } from "../../runtime/create-app-runtime";
test("confirmation reconciles an early echo; duplicate notifications retain sent status", () => {
  const { input, store } = createAppRuntime();
  input.data.setActiveChat(TEST_MANUAL_CHAT);
  const local = {
    ...historyMessage(TEST_MANUAL_CHAT.chatId, "local"),
    direction: "outgoing" as const,
    status: "sending" as const,
  };
  input.data.upsertMessage(local);
  input.data.upsertMessage({ ...local, id: "server", status: undefined });
  input.data.markSent(local.chatId, "local", "server");
  input.data.upsertMessage({ ...local, id: "server", status: undefined });
  input.data.markFailed(local.chatId, "server");
  expect(store.get(messagesAtom)).toHaveLength(1);
  expect(store.get(messagesAtom)[0]!.status).toBe("sent");
});
test("equal-time sends preserve order after reverse confirmations; unrelated chats are excluded", () => {
  const { input, store } = createAppRuntime();
  input.data.setActiveChat(TEST_MANUAL_CHAT);
  const message = historyMessage(TEST_MANUAL_CHAT.chatId);
  input.data.upsertMessage({ ...message, id: "local1" });
  input.data.upsertMessage({ ...message, id: "local2" });
  input.data.markSent(message.chatId, "local2", "server2");
  input.data.markSent(message.chatId, "local1", "server1");
  input.data.upsertMessage({ ...message, chatId: "other", id: "other" });
  expect(store.get(messagesAtom).map((item) => String(item.id))).toEqual(["server1", "server2"]);
});
test("closing resets committed data in only its scoped store", () => {
  const first = createAppRuntime(),
    second = createAppRuntime();
  for (const runtime of [first, second]) {
    runtime.input.data.setCredentials(TEST_CREDENTIALS);
    runtime.input.data.setActiveChat(TEST_MANUAL_CHAT);
    runtime.input.data.upsertMessage(historyMessage(TEST_MANUAL_CHAT.chatId));
    runtime.input.data.setDraft("draft");
  }
  first.store.set(connectionDraftAtom, TEST_CREDENTIALS);
  first.input.data.clearSession();
  expect(first.store.get(messagesAtom)).toEqual([]);
  expect(first.input.data.getCredentials()).toBeNull();
  expect(first.store.get(connectionDraftAtom)).toEqual(TEST_CREDENTIALS);
  expect(second.store.get(messagesAtom)).toHaveLength(1);
  expect(second.input.data.getDraft()).toBe("draft");
});
