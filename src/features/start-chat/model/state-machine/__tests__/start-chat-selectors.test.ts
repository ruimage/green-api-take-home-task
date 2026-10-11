import { describe } from "bun:test";

import { checkSelectors } from "@/shared/lib/xstate/testing/check-machine-selectors";

import { startChatMachine } from "../start-chat-machine";
import * as navigationSelectors from "../start-chat-selectors";

describe("navigation selectors", () =>
  checkSelectors(startChatMachine, {
    idle: navigationSelectors.selectNavigationIdle,
    editing: navigationSelectors.selectPhoneEditing,
    resolving: navigationSelectors.selectPhoneResolving,
    conversation: navigationSelectors.selectConversationSelected,
  }));
