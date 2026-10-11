import { expect, test } from "bun:test";

import { createInspector } from "@statelyai/inspect";
import type { StatelyInspectionEvent } from "@statelyai/inspect";
import { createActor, createMachine, fromPromise } from "xstate";

import { session } from "@/features/connect-messenger";
import { conversation } from "@/features/send-message";
import { navigation } from "@/features/start-chat";
import {
  ActorEventType,
  ActorStatus,
  FailureKind,
  FatalSource,
  InspectionEventType,
  WorkflowRecovery,
  WorkflowStage,
} from "@/shared/lib/app-state/model/state-machine/app-constants";
import { AppProtocol } from "@/shared/lib/app-state/model/state-machine/app-protocol";
import {
  createDataFixture,
  createSessionFixture,
  lastRequest,
  settleActors,
  TEST_CREDENTIALS,
} from "@/shared/lib/app-state/testing/app-test-fixtures";

import { createAppActor } from "../../model/state-machine/app-actors";
import { app } from "../../model/state-machine/app-vocabulary";
import {
  sanitizeAppContext,
  sanitizeAppEvent,
  filterAppInspection,
  appInspectorOptions,
} from "../app-inspection";

const secrets = {
  credentials: { idInstance: "instance-secret", apiTokenInstance: "token-secret" },
  phone: "+12345678999",
  contacts: [{ displayName: "private-contact", phone: "+12345678999" }],
  messages: [{ text: "private-message" }],
};

test("inspection event list admits user commands and excludes internal coordination and actor events", () => {
  const userCommands = [
    app.event.OPEN,
    app.event.CLOSE,
    session.event.CONNECT,
    session.event.DISCONNECT,
    navigation.event.OPEN_CHAT,
    session.event.RETRY,
    conversation.event.SEND_MESSAGE,
  ];
  const eventTypes = [
    ...Object.values(AppProtocol.event),
    app.event.OPEN,
    app.event.CLOSE,
    session.event.CONNECT,
    session.event.DISCONNECT,
    session.event.RETRY,
    navigation.event.OPEN_CHAT,
    conversation.event.SEND_MESSAGE,
    ...Object.values(ActorEventType),
    "xstate.init",
    "unknown.event",
  ];
  for (const type of eventTypes) {
    expect(
      filterAppInspection({
        type: InspectionEventType.EVENT,
        rootId: "test-root",
        sessionId: "test-session",
        sourceId: undefined,
        createdAt: "2026-10-10T00:00:00.000Z",
        id: "test-event",
        _version: "test",
        event: { type },
      }),
    ).toBe(userCommands.some((command) => command === type));
  }
});

function expectNoSecrets(value: unknown) {
  const serialized = JSON.stringify(value);
  for (const secret of [
    "instance-secret",
    "token-secret",
    "+12345678999",
    "private-contact",
    "private-message",
    "private-cause",
    "session-secret",
  ]) {
    expect(serialized).not.toContain(secret);
  }
}

test("events expose their type and control metadata without credentials or result DTO", () => {
  expect(sanitizeAppEvent({ type: session.event.CONNECT, ...secrets })).toEqual({
    type: session.event.CONNECT,
  });
  expect(sanitizeAppEvent({ type: navigation.event.OPEN_CHAT, phone: secrets.phone })).toEqual({
    type: navigation.event.OPEN_CHAT,
  });
  expect(
    sanitizeAppEvent({
      type: "xstate.done.actor.connection",
      output: {
        ...secrets,
        attemptId: 3,
        [app.projection.SESSION]: { id: "session-secret", ...secrets },
      },
    }),
  ).toEqual({ type: "xstate.done.actor.connection", output: { attemptId: 3 } });
  expect(
    sanitizeAppEvent({
      type: "xstate.done.actor.history",
      output: { key: { sessionId: "session-secret", operationId: 7 }, value: secrets.messages },
    }),
  ).toEqual({ type: "xstate.done.actor.history", output: { key: { operationId: 7 } } });
});

test("context is a whitelist and errors use canonical messages rather than transport text", () => {
  const context = {
    input: { ...secrets, data: { credentials: secrets.credentials } },
    owner: { ...secrets, [app.projection.SESSION]: { id: "session-secret" } },
    attemptId: 3,
    operation: { sessionId: "session-secret", operationId: 7 },
    submittedPhone: secrets.phone,
    error: {
      kind: FailureKind.UNAUTHORIZED,
      stage: WorkflowStage.RECEIVE,
      recovery: WorkflowRecovery.RECONNECT_SESSION,
      message: "token-secret",
      stack: "private-cause",
      cause: secrets,
    },
  };
  const sanitized = sanitizeAppContext(context);
  expect(sanitized).toEqual({
    attemptId: 3,
    operation: { operationId: 7 },
    hasSubmittedPhone: true,
    error: {
      kind: FailureKind.UNAUTHORIZED,
      stage: WorkflowStage.RECEIVE,
      recovery: WorkflowRecovery.RECONNECT_SESSION,
      message: "Подключение не авторизовано.",
    },
  });
  expect("submittedPhone" in sanitized).toBe(false);
  expectNoSecrets(sanitized);
  expect(sanitizeAppContext(sanitized)).toEqual(sanitized);
  expect(context.error.message).toBe("token-secret");
  expect(context.input.data.credentials).toBe(secrets.credentials);
});

test("fatal and actor error events retain safe classifications without raw payloads", () => {
  const error = { kind: FailureKind.NETWORK, message: "token-secret", cause: "private-cause" };
  const fatal = sanitizeAppEvent({
    type: session.event.SESSION_FATAL,
    source: FatalSource.NOTIFICATION,
    sessionId: "session-secret",
    generation: 4,
    error,
  });
  expect(fatal).toEqual({
    type: session.event.SESSION_FATAL,
    source: FatalSource.NOTIFICATION,
    generation: 4,
    error: { kind: FailureKind.NETWORK, message: "Ошибка сети. Проверьте подключение." },
  });
  expectNoSecrets(fatal);
  expectNoSecrets(sanitizeAppEvent({ type: ActorEventType.CONNECTION_ERROR, error }));
});

test("the actual inspector preserves graphs and transitions while stripping child input/output", async () => {
  const events: StatelyInspectionEvent[] = [];
  const inspector = createInspector({ send: (event) => events.push(event) }, appInspectorOptions);
  const session = { id: "session-secret", ...secrets };
  const machine = createMachine({
    id: "inspection-redaction",
    context: () => ({ ...secrets, owner: session, attemptId: 1 }),
    initial: "idle",
    states: {
      idle: { on: { CONNECT: "connecting" } },
      connecting: {
        invoke: {
          id: FailureKind.CONNECTION,
          src: fromPromise(async () => ({ attemptId: 1, session, ...secrets })),
          input: () => ({ owner: session, ...secrets }),
          onDone: "ready",
          onError: "failed",
        },
      },
      ready: {},
      failed: {},
    },
  });
  const actor = createActor(machine, { inspect: inspector.inspect }).start();
  try {
    actor.send({ type: "CONNECT", ...secrets });
    await Bun.sleep(20);
    expect(actor.getSnapshot().value).toBe("ready");
    expect(
      events.some(
        (event) =>
          event.type === InspectionEventType.ACTOR && event.definition?.includes("connecting"),
      ),
    ).toBe(true);
    const registration = events.find(
      (event) => event.type === InspectionEventType.ACTOR && event.name === "inspection-redaction",
    );
    expect(registration?.type).toBe(InspectionEventType.ACTOR);
    if (registration?.type !== InspectionEventType.ACTOR)
      throw new Error("Missing machine registration.");
    const graph = JSON.parse(registration.definition!);
    expect(graph.states.connecting.invoke.onDone).toBe("ready");
    expect(graph.states.connecting.invoke.onError).toBe("failed");
    expect(registration.snapshot).toHaveProperty("machine.definition");
    const snapshotGraph = JSON.stringify(registration.snapshot);
    expect(snapshotGraph).toContain("xstate.done.actor.connection");
    expect(snapshotGraph).toContain(ActorEventType.CONNECTION_ERROR);
    expect(snapshotGraph).not.toContain("implementations");
    expect(events.some((event) => event.type === InspectionEventType.ACTOR && event.parentId)).toBe(
      true,
    );
    expect(
      events.some(
        (event) => event.type === InspectionEventType.EVENT && event.event.type === "CONNECT",
      ),
    ).toBe(true);
    expect(
      events
        .filter((event) => event.type === InspectionEventType.EVENT)
        .every((event) => event.event.type === "CONNECT"),
    ).toBe(true);
    expect(
      events.some(
        (event) =>
          event.type === InspectionEventType.SNAPSHOT &&
          event.event.type === "xstate.done.actor.connection",
      ),
    ).toBe(true);
    expect(
      events.some(
        (event) =>
          event.type === InspectionEventType.SNAPSHOT &&
          "value" in event.snapshot &&
          event.snapshot.value === "ready",
      ),
    ).toBe(true);
    expect(
      events.some(
        (event) =>
          event.type === InspectionEventType.SNAPSHOT && event.snapshot.status === ActorStatus.DONE,
      ),
    ).toBe(true);
    expectNoSecrets(events);
  } finally {
    actor.stop();
    inspector.stop();
  }
});

test("the app's serialized graph retains every public event and actor completion transition", async () => {
  const events: StatelyInspectionEvent[] = [];
  const inspector = createInspector({ send: (event) => events.push(event) }, appInspectorOptions);
  const store = createDataFixture();
  const resources = createSessionFixture();
  const actor = createAppActor(
    { data: store.data, sessions: resources.factory },
    inspector.inspect,
  ).start();
  try {
    actor.send({ type: app.event.OPEN });
    actor.getSnapshot().children[app.child.SESSION]?.send({
      type: session.event.CONNECT,
      credentials: TEST_CREDENTIALS,
    });
    await settleActors();
    const activeSession = lastRequest(resources.sessions);
    lastRequest(activeSession.control.calls.connection).resolve();
    await settleActors();
    await Bun.sleep(20);
    const registrations = events.filter(
      (
        event,
      ): event is Extract<StatelyInspectionEvent, { type: typeof InspectionEventType.ACTOR }> =>
        event.type === InspectionEventType.ACTOR &&
        [app.id, session.id, navigation.id, conversation.id].some((id) => id === event.name),
    );
    expect(registrations).toHaveLength(4);
    const definitions = registrations
      .map((event) => (event.type === InspectionEventType.ACTOR ? event.definition : undefined))
      .join("\n");
    for (const type of [
      app.event.OPEN,
      app.event.CLOSE,
      session.event.CONNECT,
      session.event.DISCONNECT,
      navigation.event.OPEN_CHAT,
      session.event.RETRY,
    ]) {
      expect(definitions).toContain(JSON.stringify(type));
    }
    const snapshotGraph = JSON.stringify(registrations.map((event) => event.snapshot));
    for (const actorId of [FailureKind.CONNECTION, WorkflowStage.PHONE]) {
      expect(snapshotGraph).toContain(`xstate.done.actor.${actorId}`);
      expect(snapshotGraph).toContain(`xstate.error.actor.${actorId}`);
    }
    for (const registration of registrations)
      expect(registration.snapshot).toHaveProperty("machine.definition");
    expectNoSecrets(events);
  } finally {
    actor.stop();
    inspector.stop();
  }
});
