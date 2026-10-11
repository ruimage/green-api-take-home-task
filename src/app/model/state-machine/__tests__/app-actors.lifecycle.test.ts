import { afterEach, expect, test } from "bun:test";

import { session } from "@/features/connect-messenger";
import { navigation } from "@/features/start-chat";
import type { AppDataBridge } from "@/shared/lib/app-state/contracts/app-input";
import {
  ActorStatus,
  FailureKind,
  FatalSource,
} from "@/shared/lib/app-state/model/state-machine/app-constants";
import {
  createDataFixture,
  createSessionFixture,
  lastRequest,
  settleActors,
  TEST_MANUAL_CHAT,
  TEST_CREDENTIALS,
} from "@/shared/lib/app-state/testing/app-test-fixtures";

import { app } from "../app-vocabulary";
import { createAppTestActor } from "./app-test-actor";

type RehydratableActor = {
  observers: Set<unknown>;
  _processingStatus: number;
  _snapshot: unknown;
  getSnapshot(): { children?: Record<string, RehydratableActor> };
};

type RehydratableRoot = RehydratableActor & {
  stop(): void;
  system: { getSnapshot?(): unknown; _snapshot: unknown };
};
function stopRootWithRehydration(actor: ReturnType<typeof createAppTestActor>) {
  const root = actor.root as unknown as RehydratableRoot;
  const persistedSnapshots: [RehydratableActor, unknown][] = [];
  function visit(ref: RehydratableActor) {
    const snapshot = ref.getSnapshot();
    persistedSnapshots.push([ref, snapshot]);
    ref.observers = new Set();
    if (snapshot.children) {
      for (const child of Object.values(snapshot.children)) visit(child);
    }
  }
  visit(root);
  const systemSnapshot = root.system.getSnapshot?.();
  root.stop();
  root.system._snapshot = systemSnapshot;
  for (const [ref, snapshot] of persistedSnapshots) {
    ref._processingStatus = 0;
    ref._snapshot = snapshot;
  }
}

const actors: ReturnType<typeof createAppTestActor>[] = [];

afterEach(() => {
  for (const actor of actors.splice(0)) actor.stop();
});

function createHarness(dataOverrides: Partial<AppDataBridge> = {}) {
  const store = createDataFixture();
  const resources = createSessionFixture();
  const input = {
    sessions: resources.factory,
    data: { ...store.data, ...dataOverrides },
  };
  const actor = createAppTestActor(input).start();
  actors.push(actor);
  return { actor, input, ...store, ...resources };
}

type Harness = ReturnType<typeof createHarness>;

async function connect(harness: Harness) {
  harness.actor.send({ type: app.event.OPEN });
  harness.actor.send({ type: session.event.CONNECT, credentials: TEST_CREDENTIALS });
  await settleActors();
  const activeSession = lastRequest(harness.sessions);
  lastRequest(activeSession.control.calls.connection).resolve();
  await settleActors();

  return activeSession;
}

function expectDisconnected(harness: Harness) {
  expect(harness.actor.getSnapshot().status).toBe(ActorStatus.ACTIVE);
  expect(
    harness.actor
      .getSnapshot()
      .matches({ [app.state.OPENED]: { [app.projection.DISCONNECTED]: session.state.IDLE } }),
  ).toBe(true);
  expect(harness.actor.getSnapshot().context.error).toBeNull();
  expect(harness.actor.getSnapshot().context.operation).toBeNull();
  expect(harness.actor.getSnapshot().context.owner?.getSession()).toBeNull();
  expect(harness.actor.getSnapshot().context.owner?.getNotificationGeneration()).toBeNull();
  expect(harness.state.credentials).toBeNull();
  expect(harness.state.activeChat).toBeNull();
}

test("a rehydrated initial actor can connect with its original runtime owner", async () => {
  const harness = createHarness();
  const owner = harness.actor.getSnapshot().context.owner;
  stopRootWithRehydration(harness.actor);
  harness.actor.start();
  expect(harness.actor.getSnapshot().context.owner).toBe(owner);
  expect(harness.actor.getSnapshot().status).toBe(ActorStatus.ACTIVE);
  expect(harness.actor.getSnapshot().matches(app.state.COLLAPSED)).toBe(true);
  await connect(harness);
  expect(
    harness.actor
      .getSnapshot()
      .matches({ [app.state.OPENED]: { [app.projection.SESSION]: navigation.state.EDITING } }),
  ).toBe(true);
  expect(harness.sessions).toHaveLength(1);
});

test("rehydrating a pending connection disposes it and starts only a new explicit attempt", async () => {
  const harness = createHarness();
  harness.actor.send({ type: app.event.OPEN });
  harness.actor.send({ type: session.event.CONNECT, credentials: TEST_CREDENTIALS });
  await settleActors();
  const activeSession = lastRequest(harness.sessions);
  const oldConnection = lastRequest(activeSession.control.calls.connection);
  const owner = harness.actor.getSnapshot().context.owner;
  const attemptId = harness.actor.getSnapshot().context.attemptId;
  stopRootWithRehydration(harness.actor);
  expect(activeSession.disposeCount).toBe(1);
  expect(oldConnection.signal?.aborted).toBe(true);
  harness.actor.start();
  await settleActors();
  expect(harness.actor.getSnapshot().context.owner).toBe(owner);
  expect(owner?.isAttemptCurrent(attemptId)).toBe(false);
  expectDisconnected(harness);
  expect(harness.sessions).toHaveLength(1);
  oldConnection.resolve();
  await settleActors();
  expectDisconnected(harness);
  await connect(harness);
  expect(harness.sessions).toHaveLength(2);
  expect(activeSession.disposeCount).toBe(1);
  expect(
    harness.actor
      .getSnapshot()
      .matches({ [app.state.OPENED]: { [app.projection.SESSION]: navigation.state.EDITING } }),
  ).toBe(true);
});

test("rehydrating conversation never restarts notifications on the disposed session", async () => {
  const harness = createHarness();
  const activeSession = await connect(harness);
  harness.actor.send({ type: navigation.event.OPEN_CHAT, phone: TEST_MANUAL_CHAT.displayName });
  await settleActors();
  lastRequest(activeSession.control.calls.phone).resolve(TEST_MANUAL_CHAT);
  await settleActors();
  const owner = harness.actor.getSnapshot().context.owner;
  const generation = owner?.getNotificationGeneration();
  expect(generation).toBeNumber();
  stopRootWithRehydration(harness.actor);
  expect(owner?.getNotificationGeneration()).toBeNull();
  harness.actor.start();
  await settleActors();
  expect(harness.actor.getSnapshot().context.owner).toBe(owner);
  expectDisconnected(harness);
  expect(activeSession.disposeCount).toBe(1);
  expect(harness.actor.getSnapshot().children.notifications).toBeUndefined();
  expect(
    owner?.isFatalCurrent({
      type: session.event.SESSION_FATAL,
      sessionId: activeSession.id,
      source: FatalSource.NOTIFICATION,
      generation: generation!,
      error: { kind: FailureKind.CONNECTION, message: "obsolete" },
    }),
  ).toBe(false);
  await connect(harness);
  expect(
    harness.actor
      .getSnapshot()
      .matches({ [app.state.OPENED]: { [app.projection.SESSION]: navigation.state.EDITING } }),
  ).toBe(true);
});

test("a root action error still releases its session when bridge cleanup throws", async () => {
  const harness = createHarness({
    setActiveChat() {
      throw new Error("Bridge update failed.");
    },
    clearSession() {
      throw new Error("Bridge cleanup failed.");
    },
  });
  let errorCount = 0;
  harness.actor.subscribe({
    error() {
      errorCount += 1;
    },
  });
  harness.actor.send({ type: app.event.OPEN });
  harness.actor.send({ type: session.event.CONNECT, credentials: TEST_CREDENTIALS });
  await settleActors();
  const activeSession = lastRequest(harness.sessions);
  lastRequest(activeSession.control.calls.connection).resolve();
  await settleActors();
  harness.actor.send({ type: navigation.event.OPEN_CHAT, phone: TEST_MANUAL_CHAT.displayName });
  await settleActors();
  lastRequest(activeSession.control.calls.phone).resolve(TEST_MANUAL_CHAT);
  await settleActors();
  const owner = harness.actor.getSnapshot().context.owner;
  const operation = harness.actor.getSnapshot().context.operation;

  expect(harness.actor.getSnapshot().status).toBe(ActorStatus.ACTIVE);
  expect(errorCount).toBe(0);
  expect(
    harness.actor
      .getSnapshot()
      .matches({ [app.state.OPENED]: { [app.projection.DISCONNECTED]: session.state.IDLE } }),
  ).toBe(true);
  expect(activeSession.disposeCount).toBe(1);
  expect(owner?.getSession()).toBeNull();
  expect(operation ? owner?.isCurrent(operation) : false).toBe(false);
  expect(owner?.cleanupError?.kind).toBe(FailureKind.UNKNOWN);
  expect(() => harness.actor.stop()).not.toThrow();
  expect(activeSession.disposeCount).toBe(1);
});
