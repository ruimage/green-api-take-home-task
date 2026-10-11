import type { SnapshotFrom } from "xstate";

import type { WorkflowEvent } from "@/shared/lib/app-state/model/types";

import type { navigation } from "./state-machine/navigation-vocabulary";
import type { startChatMachine } from "./state-machine/start-chat-machine";

export type StartChatEvent = Extract<
  WorkflowEvent,
  {
    type:
      | typeof navigation.event.ACTIVATE
      | typeof navigation.event.DEACTIVATE
      | typeof navigation.event.OPEN_CHAT;
  }
>;

export type StartChatSnapshot = SnapshotFrom<typeof startChatMachine>;
