import type { SnapshotFrom, AnyActorRef } from "xstate";

import type { WorkflowEvent } from "@/shared/lib/app-state/model/types";
import type { AppRuntimeOwner } from "@/shared/lib/app-state/runtime/app-runtime";

import type { connectMessengerMachine } from "./state-machine/connect-messenger-machine";
import type { session } from "./state-machine/session-vocabulary";

export type ConnectionLifecycleInput = { owner: AppRuntimeOwner | null; parent: AnyActorRef };

export type ConnectMessengerEvent = Extract<
  WorkflowEvent,
  {
    type:
      | typeof session.event.CONNECT
      | typeof session.event.DISCONNECT
      | typeof session.event.RETRY
      | typeof session.event.SESSION_FATAL
      | typeof session.event.WORKFLOW_FAILED;
  }
>;

export type ConnectMessengerSnapshot = SnapshotFrom<typeof connectMessengerMachine>;
