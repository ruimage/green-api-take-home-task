import { sendParent, setup } from "xstate";

import type { SessionFatalEvent } from "@/shared/lib/app-state/model/types";

import type { ReceiveMessagesInput } from "../types";
import { notificationActor } from "./notification-actor";
import { receiveNotifications } from "./receive-notifications-vocabulary";

export const receiveMessagesMachine = setup({
  types: {
    context: {} as ReceiveMessagesInput,
    input: {} as ReceiveMessagesInput | null,
    events: {} as SessionFatalEvent,
  },
  actors: { [receiveNotifications.actor.NOTIFICATIONS]: notificationActor },
}).createMachine({
  id: receiveNotifications.id,
  context: ({ input }) => input ?? { owner: null },
  invoke: {
    id: receiveNotifications.actorId.NOTIFICATIONS,
    src: receiveNotifications.actor.NOTIFICATIONS,
    input: ({ context }) => context,
  },
  on: {
    [receiveNotifications.event.SESSION_FATAL]: {
      guard: ({ context, event }) => context.owner?.isFatalCurrent(event) ?? false,
      actions: sendParent(({ event }) => event),
    },
  },
});
