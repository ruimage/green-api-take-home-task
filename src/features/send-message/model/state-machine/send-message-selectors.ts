import { createMachineSelectors } from "@/shared/lib/reselect/selector-factory";

import type { MessageSendingSnapshot } from "../types";
import { conversation } from "./conversation-vocabulary";
const selectors = createMachineSelectors<MessageSendingSnapshot>();
export const selectConversationState = selectors.selectStateValue;
export const selectConversation = selectors.state(conversation.state.CONVERSATION);
export const selectConversationIdle = selectors.state(conversation.state.IDLE);
