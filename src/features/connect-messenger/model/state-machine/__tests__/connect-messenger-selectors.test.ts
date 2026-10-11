import { describe } from "bun:test";

import { checkSelectors } from "@/shared/lib/xstate/testing/check-machine-selectors";

import { connectMessengerMachine } from "../connect-messenger-machine";
import * as sessionSelectors from "../connect-messenger-selectors";

describe("session selectors", () =>
  checkSelectors(connectMessengerMachine, {
    idle: sessionSelectors.selectDisconnectedIdle,
    failed: sessionSelectors.selectDisconnectedFailed,
    connecting: sessionSelectors.selectConnecting,
    ready: sessionSelectors.selectSession,
  }));
