import { AppProtocol } from "@/shared/lib/app-state/model/state-machine/app-protocol";

export const session = {
  id: "session",
  state: {
    IDLE: "idle",
    CONNECTING: "connecting",
    READY: "ready",
    FAILED: "failed",
  },
  stateId: {
    IDLE: "connectionIdle",
    CONNECTING: "session.connecting",
    READY: "sessionReady",
    FAILED: "connectionFailed",
  },
  target: {
    IDLE: "#connectionIdle",
    CONNECTING: "#session.connecting",
    READY: "#sessionReady",
    FAILED: "#connectionFailed",
  },
  event: {
    CONNECT: "CONNECT",
    DISCONNECT: "DISCONNECT",
    RETRY: "RETRY",
    SESSION_READY: AppProtocol.event.SESSION_READY,
    SESSION_ENDED: AppProtocol.event.SESSION_ENDED,
    SESSION_FATAL: AppProtocol.event.SESSION_FATAL,
    WORKFLOW_FAILED: AppProtocol.event.WORKFLOW_FAILED,
  },
  actor: {
    CONNECTION: "connectionActor",
    RUNTIME_LIFECYCLE: "runtimeLifecycle",
  },
  actorId: {
    CONNECTION: "connection",
    RUNTIME_LIFECYCLE: "runtimeLifecycle",
  },
  action: {
    SAVE_CREDENTIALS: "saveCredentials",
    BEGIN_ATTEMPT: "beginAttempt",
    END_SESSION: "endSession",
    RESET: "reset",
    CLEAR_ERROR: "clearError",
    SAVE_FATAL: "saveFatal",
  },
  guard: {
    CAN_CONNECT: "canConnect",
    CAN_RETRY_CONNECTION: "canRetryConnection",
    CURRENT_FATAL: "currentFatal",
  },
} as const;
