import type { createStore } from "jotai";
import { DevTools } from "jotai-devtools";

import { useFloatingDevTools } from "./use-floating-devtools";

import "jotai-devtools/styles.css";
import "./jotai-devtools.css";

export function JotaiDevTools({ store }: { store: ReturnType<typeof createStore> }) {
  useFloatingDevTools();
  return (
    <DevTools
      store={store}
      theme="dark"
      position="bottom-left"
      options={{ snapshotHistoryLimit: 30 }}
    />
  );
}
