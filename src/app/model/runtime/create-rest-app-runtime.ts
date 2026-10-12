import { createStore } from "jotai";

import { apiUrlDraftAtom, configuredApiUrlAtom } from "@/features/connect-messenger";
import type { RestOptions } from "@/shared/lib/green-api-rest/types";

import { createRestSessionFactory } from "./create-rest-session-factory";
import { createRuntimeWithSessions } from "./create-runtime-with-sessions";

export function createRestAppRuntime(options: RestOptions = {}) {
  const store = createStore();
  const configuredApiUrl = options.apiUrl?.trim() || undefined;
  store.set(configuredApiUrlAtom, configuredApiUrl);
  return createRuntimeWithSessions(
    createRestSessionFactory(() => ({
      ...options,
      apiUrl: configuredApiUrl ?? store.get(apiUrlDraftAtom).trim(),
    })),
    store,
  );
}
