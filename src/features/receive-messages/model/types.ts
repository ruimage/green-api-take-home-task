import type { ActorEventType } from "@/shared/lib/app-state/model/state-machine/app-constants";
import type { AppRuntimeOwner } from "@/shared/lib/app-state/runtime/app-runtime";

export type ReceiveMessagesInput = { owner: AppRuntimeOwner | null };
export type NotificationActorEvent = { type: typeof ActorEventType.STOP };
