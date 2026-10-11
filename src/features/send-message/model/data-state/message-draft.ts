import { atom, useAtom } from "jotai";

export const messageDraftAtom = atom("");
if (process.env.NODE_ENV === "development") {
  messageDraftAtom.debugLabel = "chatConversation.messageDraft";
}
export function useMessageDraft() {
  return useAtom(messageDraftAtom);
}
