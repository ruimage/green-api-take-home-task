export const AppProtocol = {
  event: {
    ACTIVATE: "ACTIVATE",
    DEACTIVATE: "DEACTIVATE",
    SESSION_READY: "SESSION_READY",
    SESSION_ENDED: "SESSION_ENDED",
    CHAT_OPENED: "CHAT_OPENED",
    CHAT_CLOSED: "CHAT_CLOSED",
    SESSION_FATAL: "SESSION_FATAL",
    WORKFLOW_FAILED: "WORKFLOW_FAILED",
  },
} as const;

export const AppShell = {
  state: {
    COLLAPSED: "collapsed",
    OPENED: "opened",
  },
  event: {
    OPEN: "OPEN",
    CLOSE: "CLOSE",
  },
} as const;
