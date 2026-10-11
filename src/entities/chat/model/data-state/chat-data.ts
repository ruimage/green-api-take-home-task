import { atom, useAtomValue } from "jotai";

import type { ChatMessage, ChatSummary } from "../types";
export const activeChatAtom = atom<ChatSummary | null>(null);
export const messagesAtom = atom<ChatMessage[]>([]);
if (process.env.NODE_ENV === "development") {
  activeChatAtom.debugLabel = "chat.activeChat";
  messagesAtom.debugLabel = "chat.messages";
}
export function useActiveChat() {
  return useAtomValue(activeChatAtom);
}
export function useActiveChatMessages() {
  return useAtomValue(messagesAtom);
}
