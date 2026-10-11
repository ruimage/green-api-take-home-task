import { atom, useAtom } from "jotai";
import type { createStore } from "jotai";

import type { MessengerCredentialsDto } from "@/shared/service/messenger/dto";

const emptyDraft: MessengerCredentialsDto = { idInstance: "", apiTokenInstance: "" };

export const connectionDraftAtom = atom<MessengerCredentialsDto>(emptyDraft);

if (process.env.NODE_ENV === "development") {
  connectionDraftAtom.debugLabel = "messengerSession.connectionDraft";
}

export function useConnectionDraft() {
  const [draft, setDraft] = useAtom(connectionDraftAtom);
  return {
    draft,
    setIdInstance: (idInstance: string) => setDraft((value) => ({ ...value, idInstance })),
    setApiTokenInstance: (apiTokenInstance: string) =>
      setDraft((value) => ({ ...value, apiTokenInstance })),
  };
}

export function clearConnectionDraft(store: Pick<ReturnType<typeof createStore>, "set">) {
  store.set(connectionDraftAtom, emptyDraft);
}
