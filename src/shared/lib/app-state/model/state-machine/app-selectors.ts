import { createMachineSelectors } from "@/shared/lib/reselect/selector-factory";

import type { ShellSnapshot } from "../types";
import { AppShell } from "./app-protocol";

const selectors = createMachineSelectors<ShellSnapshot>();
export const selectStateValue = selectors.selectStateValue;
export const createStateSelector = selectors.state;
export const selectCollapsed = selectors.state(AppShell.state.COLLAPSED);
export const selectOpened = selectors.state(AppShell.state.OPENED);
export const selectCanOpen = selectors.create([(snapshot: ShellSnapshot) => snapshot], (s) =>
  s.can({ type: AppShell.event.OPEN }),
);
export const selectCanClose = selectors.create([(snapshot: ShellSnapshot) => snapshot], (s) =>
  s.can({ type: AppShell.event.CLOSE }),
);
