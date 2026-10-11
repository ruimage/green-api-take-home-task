import { expect, test } from "bun:test";

import { FailureKind, FatalSource } from "../../model/state-machine/app-constants";
import { AppProtocol } from "../../model/state-machine/app-protocol";
import {
  createDataFixture,
  createSessionFixture,
  lastRequest,
  TEST_CREDENTIALS,
} from "../../testing/app-test-fixtures";
import { AppRuntimeOwner } from "../app-runtime";

test("stop contains bridge cleanup failures and resume leaves all old ownership invalid", () => {
  const store = createDataFixture();
  const resources = createSessionFixture();
  const owner = new AppRuntimeOwner({
    sessions: resources.factory,
    data: {
      ...store.data,
      clearSession() {
        throw new Error("private bridge failure");
      },
    },
  });
  const attemptId = owner.beginAttempt();
  const session = resources.factory.create(TEST_CREDENTIALS);
  owner.register(session, attemptId);
  const operation = owner.nextOperation();
  const generation = owner.beginNotification();
  const sessionId = owner.registerSend("old-send");
  expect(() => owner.stop()).not.toThrow();
  expect(owner.cleanupError?.kind).toBe(FailureKind.UNKNOWN);
  expect(owner.cleanupError?.message).not.toContain("private bridge failure");
  expect(owner.getSession()).toBeNull();
  expect(owner.resume()).toBe(true);
  expect(owner.resume()).toBe(false);
  expect(owner.isAttemptCurrent(attemptId)).toBe(false);
  expect(owner.isCurrent(operation)).toBe(false);
  expect(owner.isSendCurrent(sessionId, "old-send")).toBe(false);
  expect(
    owner.isFatalCurrent({
      type: AppProtocol.event.SESSION_FATAL,
      sessionId,
      source: FatalSource.NOTIFICATION,
      generation,
      error: { kind: FailureKind.CONNECTION, message: "obsolete" },
    }),
  ).toBe(false);
  expect(() => owner.register(session, owner.beginAttempt())).toThrow();
  expect(() => owner.stop()).not.toThrow();
  expect(lastRequest(resources.sessions).disposeCount).toBe(1);
});

test("credential restoration failure cannot escape endSession or actor cleanup", () => {
  const store = createDataFixture();
  const resources = createSessionFixture();
  const owner = new AppRuntimeOwner({
    sessions: resources.factory,
    data: {
      ...store.data,
      setCredentials() {
        throw new Error("private credentials failure");
      },
    },
  });
  expect(() => owner.endSession(true)).not.toThrow();
  expect(owner.cleanupError?.kind).toBe(FailureKind.UNKNOWN);
  expect(owner.cleanupError?.message).not.toContain("private credentials failure");
  expect(() => owner.stop()).not.toThrow();
});
