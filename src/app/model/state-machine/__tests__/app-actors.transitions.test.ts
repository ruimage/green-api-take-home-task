import { afterEach, expect, test } from "bun:test";

import { session } from "@/features/connect-messenger";
import { conversation } from "@/features/send-message";
import { navigation } from "@/features/start-chat";
import {
  createDataFixture,
  createSessionFixture,
  lastRequest,
  settleActors,
  TEST_CREDENTIALS,
  TEST_MANUAL_CHAT,
  historyMessage,
} from "@/shared/lib/app-state/testing/app-test-fixtures";
import {
  MessengerNetworkError,
  MessengerUnauthorizedError,
} from "@/shared/service/messenger/errors";

import { app } from "../app-vocabulary";
import { createAppTestActor } from "./app-test-actor";

const harnesses: { actor: ReturnType<typeof createAppTestActor> }[] = [];
function harness() {
  const data = createDataFixture(),
    resources = createSessionFixture();
  const actor = createAppTestActor({ data: data.data, sessions: resources.factory }).start();
  const value = { ...data, ...resources, actor };
  harnesses.push(value);
  return value;
}
afterEach(() => {
  for (const h of harnesses.splice(0)) h.actor.stop();
});
async function connect(h: ReturnType<typeof harness>) {
  h.actor.send({ type: app.event.OPEN });
  h.actor.send({ type: session.event.CONNECT, credentials: TEST_CREDENTIALS });
  await settleActors();
  const activeSession = lastRequest(h.sessions);
  lastRequest(activeSession.control.calls.connection).resolve();
  await settleActors();
  return activeSession;
}
async function openChat(h: ReturnType<typeof harness>) {
  const activeSession = await connect(h);
  h.actor.send({ type: navigation.event.OPEN_CHAT, phone: TEST_MANUAL_CHAT.displayName });
  await settleActors();
  lastRequest(activeSession.control.calls.phone).resolve(TEST_MANUAL_CHAT);
  await settleActors();
  return activeSession;
}
test("connection goes directly to phone entry; invalid numbers make no request", async () => {
  const h = harness(),
    activeSession = await connect(h);
  expect(h.actor.actors.navigation?.getSnapshot().value).toBe(navigation.state.EDITING);
  h.actor.send({ type: navigation.event.OPEN_CHAT, phone: "123" });
  await settleActors();
  expect(activeSession.control.calls.phone).toHaveLength(0);
  expect(activeSession.control.calls.receive).toHaveLength(0);
});
test("phone failure permits correction and late phone resolution after close is ignored", async () => {
  const h = harness(),
    activeSession = await connect(h);
  h.actor.send({ type: navigation.event.OPEN_CHAT, phone: TEST_MANUAL_CHAT.displayName });
  await settleActors();
  lastRequest(activeSession.control.calls.phone).reject(new MessengerNetworkError());
  await settleActors();
  expect(h.actor.actors.navigation?.getSnapshot().value).toBe(navigation.state.EDITING);
  h.actor.send({ type: navigation.event.OPEN_CHAT, phone: TEST_MANUAL_CHAT.displayName });
  await settleActors();
  const phone = lastRequest(activeSession.control.calls.phone);
  h.actor.send({ type: app.event.CLOSE });
  expect(phone.signal?.aborted).toBe(true);
  phone.resolve(TEST_MANUAL_CHAT);
  await settleActors();
  expect(h.state.activeChat).toBeNull();
});
test("poll stores a reply then acknowledges it before receiving again", async () => {
  const h = harness(),
    activeSession = await openChat(h);
  expect(h.actor.actors.conversation?.getSnapshot().value).toBe(conversation.state.CONVERSATION);
  const receive = lastRequest(activeSession.control.calls.receive);
  receive.resolve({
    type: "message",
    receiptId: 12,
    message: historyMessage(TEST_MANUAL_CHAT.chatId),
  });
  await settleActors();
  expect(h.state.messages).toHaveLength(1);
  expect(activeSession.control.calls.receive).toHaveLength(1);
  expect(lastRequest(activeSession.control.calls.acknowledge).receiptId).toBe(12);
  lastRequest(activeSession.control.calls.acknowledge).resolve();
  await settleActors();
  expect(activeSession.control.calls.receive).toHaveLength(2);
});
test("unsupported notifications and other chats are acknowledged without entering this conversation", async () => {
  const h = harness(),
    activeSession = await openChat(h);
  lastRequest(activeSession.control.calls.receive).resolve({ type: "unsupported", receiptId: 1 });
  await settleActors();
  lastRequest(activeSession.control.calls.acknowledge).resolve();
  await settleActors();
  lastRequest(activeSession.control.calls.receive).resolve({
    type: "message",
    receiptId: 2,
    message: historyMessage("other@c.us"),
  });
  await settleActors();
  expect(h.state.messages).toHaveLength(0);
  expect(activeSession.control.calls.acknowledge.map((call) => call.receiptId)).toEqual([1, 2]);
});
test("close cancels polling and ignores late replies", async () => {
  const h = harness(),
    activeSession = await openChat(h),
    receive = lastRequest(activeSession.control.calls.receive);
  h.actor.send({ type: app.event.CLOSE });
  expect(receive.signal?.aborted).toBe(true);
  receive.resolve({
    type: "message",
    receiptId: 7,
    message: historyMessage(TEST_MANUAL_CHAT.chatId),
  });
  await settleActors();
  expect(h.state.messages).toHaveLength(0);
  expect(activeSession.control.calls.acknowledge).toHaveLength(0);
  expect(activeSession.disposeCount).toBe(1);
});
test("unauthorized polling ends the session with a safe error", async () => {
  const h = harness(),
    activeSession = await openChat(h);
  lastRequest(activeSession.control.calls.receive).reject(new MessengerUnauthorizedError());
  await settleActors();
  expect(h.actor.actors.session?.getSnapshot().value).toBe(session.state.FAILED);
  expect(h.state.credentials).toBeNull();
  expect(activeSession.disposeCount).toBe(1);
});
