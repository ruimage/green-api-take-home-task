import { AppProtocol } from "@/shared/lib/app-state/model/state-machine/app-protocol";

export const receiveNotifications = {
  id: "receiveNotifications",
  event: {
    SESSION_FATAL: AppProtocol.event.SESSION_FATAL,
  },
  actor: {
    NOTIFICATIONS: "notificationActor",
  },
  actorId: {
    NOTIFICATIONS: "notifications",
  },
} as const;
