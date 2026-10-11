import { createMachineSelectors } from "@/shared/lib/reselect/selector-factory";

import type { AppSnapshot } from "../types";
import { app } from "./app-vocabulary";

const selectors = createMachineSelectors<AppSnapshot>();
export const createWorkflowSelector = selectors.state;
export const selectGuest = selectors.state(`${app.state.OPENED}.${app.state.GUEST}`);
export const selectWorkflow = selectors.state(`${app.state.OPENED}.${app.state.WORKFLOW}`);
export const selectChatless = selectors.state(
  `${app.state.OPENED}.${app.state.WORKFLOW}.${app.state.CHATLESS}`,
);
export const selectChat = selectors.state(
  `${app.state.OPENED}.${app.state.WORKFLOW}.${app.state.CHAT}`,
);
