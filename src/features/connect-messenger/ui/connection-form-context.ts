import { createContext, useContext } from "react";

import type { ConnectionFormState } from "./types";

export const ConnectionFormContext = createContext<ConnectionFormState | null>(null);

export function useConnectionFormState() {
  const state = useContext(ConnectionFormContext);
  if (!state) throw new Error("Connection form components require ConnectionFormTemplate");
  return state;
}
