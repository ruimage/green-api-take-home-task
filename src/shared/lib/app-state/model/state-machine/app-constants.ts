export const StateNodeType = {
  FINAL: "final",
} as const;

export const WorkflowStage = {
  CONNECTION: "connection",
  PHONE: "phone",
  SEND: "send",
  RECEIVE: "receive",
} as const;

export const WorkflowRecovery = {
  RETRY: "retry",
  BACK_ONLY: "backOnly",
  RECONNECT_SESSION: "reconnectSession",
} as const;

export const FailureKind = {
  CONNECTION: "connection",
  UNAUTHORIZED: "unauthorized",
  RATE_LIMIT: "rateLimit",
  NETWORK: "network",
  UNKNOWN: "unknown",
} as const;

export const FatalSource = {
  NOTIFICATION: "notification",
  SEND: "send",
} as const;

export const ActorStatus = {
  ACTIVE: "active",
  DONE: "done",
  ERROR: "error",
  STOPPED: "stopped",
} as const;

export const InspectionEventType = {
  ACTOR: "@xstate.actor",
  EVENT: "@xstate.event",
  SNAPSHOT: "@xstate.snapshot",
} as const;

export const ActorEventPrefix = {
  DONE: "xstate.done.actor.",
  ERROR: "xstate.error.actor.",
} as const;

export const ActorEventType = {
  STOP: "STOP",
  CONNECTION_ERROR: `${ActorEventPrefix.ERROR}connection`,
} as const;
