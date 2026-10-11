import type { ActorRefFrom, EventFrom, SnapshotFrom } from "xstate";

import type { appMachine } from "@/app/model/state-machine/app-machine";
import type { app } from "@/app/model/state-machine/app-vocabulary";
import type { connectMessengerMachine } from "@/features/connect-messenger";
import type { messageSendingMachine } from "@/features/send-message";
import type { startChatMachine } from "@/features/start-chat";
import type { WorkflowError } from "@/shared/lib/app-state/model/state-machine/app-errors";
import type { SessionFatalEvent } from "@/shared/lib/app-state/model/types";
import type { RestOptions } from "@/shared/lib/green-api-rest/types";
import type { SdkOptions } from "@/shared/lib/green-api-sdk/sdk-client";

export type AppRuntimeOptions =
  | (SdkOptions & { adapter?: "sdk" })
  | (RestOptions & { adapter: "rest" });

export type AppActors = {
  app: ActorRefFrom<typeof appMachine>;
  session: ActorRefFrom<typeof connectMessengerMachine> | null;
  navigation: ActorRefFrom<typeof startChatMachine> | null;
  conversation: ActorRefFrom<typeof messageSendingMachine> | null;
};

export type AppSnapshot = SnapshotFrom<typeof appMachine>;

export type AppActorRef = ActorRefFrom<typeof appMachine>;

export type AppEvent = EventFrom<typeof appMachine>;

export type AppRootEvent =
  | { type: typeof app.event.OPEN }
  | { type: typeof app.event.CLOSE }
  | SessionFatalEvent
  | { type: typeof app.event.SESSION_READY }
  | { type: typeof app.event.SESSION_ENDED }
  | { type: typeof app.event.CHAT_OPENED }
  | { type: typeof app.event.CHAT_CLOSED }
  | { type: typeof app.event.WORKFLOW_FAILED; error: WorkflowError }
  | { type: `xstate.error.actor.${typeof app.child.SESSION}`; error: unknown }
  | { type: `xstate.error.actor.${typeof app.child.NAVIGATION}`; error: unknown }
  | { type: `xstate.error.actor.${typeof app.child.CONVERSATION}`; error: unknown }
  | { type: `xstate.error.actor.${typeof app.child.NOTIFICATIONS}`; error: unknown };
