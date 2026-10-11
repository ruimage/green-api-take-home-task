import { describe } from "bun:test";

import { checkSelectors } from "@/shared/lib/xstate/testing/check-machine-selectors";

import { messageSendingMachine } from "../message-sending-machine";
import * as conversationSelectors from "../send-message-selectors";

describe("conversation selectors", () =>
  checkSelectors(messageSendingMachine, {
    idle: conversationSelectors.selectConversationIdle,
    conversation: conversationSelectors.selectConversation,
  }));
