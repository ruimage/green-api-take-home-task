import { createMachineSelectors } from "@/shared/lib/reselect/selector-factory";

import type { ConnectMessengerSnapshot } from "../types";
import { session } from "./session-vocabulary";
const selectors = createMachineSelectors<ConnectMessengerSnapshot>();
export const selectSessionState = selectors.selectStateValue;
export const selectDisconnectedIdle = selectors.state(session.state.IDLE);
export const selectDisconnectedFailed = selectors.state(session.state.FAILED);
export const selectConnecting = selectors.state(session.state.CONNECTING);
export const selectSession = selectors.state(session.state.READY);
export const selectSessionError = (snapshot: ConnectMessengerSnapshot) => snapshot.context.error;
export const selectConnectionAvailable = (snapshot: ConnectMessengerSnapshot) =>
  !!snapshot.context.owner;
export const selectCanRetry = selectors.create(
  [(snapshot: ConnectMessengerSnapshot) => snapshot],
  (s) => s.can({ type: session.event.RETRY }),
);
