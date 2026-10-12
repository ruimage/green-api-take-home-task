import { createStore } from "jotai";

import type {
  AppMachineInput,
  AppSessionFactory,
} from "@/shared/lib/app-state/contracts/app-input";

import { createAppDataBridge } from "../data-state/create-app-data-bridge";

export function createRuntimeWithSessions(sessions: AppSessionFactory, store = createStore()) {
  const input: AppMachineInput = {
    data: createAppDataBridge(store),
    sessions,
  };
  return { store, input };
}
