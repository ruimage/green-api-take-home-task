import { fromCallback } from "xstate";

import {
  FatalSource,
  WorkflowStage,
} from "@/shared/lib/app-state/model/state-machine/app-constants";
import { toWorkflowError } from "@/shared/lib/app-state/model/state-machine/app-errors";
import type { SessionFatalEvent } from "@/shared/lib/app-state/model/types";
import { MessengerNotificationType } from "@/shared/service/messenger/dto";

import type { NotificationActorEvent, ReceiveMessagesInput } from "../types";
import { receiveNotifications } from "./receive-notifications-vocabulary";

export const notificationActor = fromCallback<NotificationActorEvent, ReceiveMessagesInput | null>(
  ({ input, sendBack }) => {
    const owner = input?.owner;
    const session = owner?.getSession();
    if (!owner || !session) return;
    const generation = owner.beginNotification();
    const controller = new AbortController();
    const current = () =>
      !controller.signal.aborted &&
      owner.getSession() === session &&
      owner.getNotificationGeneration() === generation;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let wake: (() => void) | undefined;
    const pause = (ms: number) =>
      new Promise<void>((resolve) => {
        wake = resolve;
        timer = setTimeout(() => {
          wake = undefined;
          resolve();
        }, ms);
      });
    const messenger = session.dependencies.messenger;
    async function poll() {
      while (current()) {
        try {
          const notification = await messenger.receiveNotification(controller.signal);
          if (!current()) return;
          if (notification) {
            if (notification.type === MessengerNotificationType.MESSAGE)
              owner!.input.data.upsertMessage(notification.message);
            await messenger.acknowledgeNotification(notification.receiptId, controller.signal);
          } else await pause(250);
        } catch (error) {
          if (!current()) return;
          sendBack({
            type: receiveNotifications.event.SESSION_FATAL,
            source: FatalSource.NOTIFICATION,
            sessionId: session!.id,
            generation,
            error: toWorkflowError(error, WorkflowStage.RECEIVE),
          } satisfies SessionFatalEvent);
          return;
        }
      }
    }
    void poll();
    return () => {
      controller.abort();
      clearTimeout(timer);
      wake?.();
      owner.endNotification(generation);
    };
  },
);
