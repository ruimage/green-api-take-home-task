import { createMachineSelectors } from "@/shared/lib/reselect/selector-factory";

import type { StartChatSnapshot } from "../types";
import { navigation } from "./navigation-vocabulary";
const selectors = createMachineSelectors<StartChatSnapshot>();
export const selectNavigationState = selectors.selectStateValue;
export const selectConversationSelected = selectors.state(navigation.state.CONVERSATION);
export const selectPhoneEditing = selectors.state(navigation.state.EDITING);
export const selectPhoneResolving = selectors.state(navigation.state.RESOLVING);
export const selectNavigationIdle = selectors.state(navigation.state.IDLE);
export const selectNavigationError = (snapshot: StartChatSnapshot) => snapshot.context.error;
