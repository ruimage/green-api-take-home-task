import type { createStore } from "jotai";

import {
  activeChatAtom,
  messagesAtom,
  MessageStatus,
  createChatMessage,
  createChatSummary,
} from "@/entities/chat";
import { credentialsAtom } from "@/features/connect-messenger";
import { messageDraftAtom } from "@/features/send-message";
import type { AppDataBridge } from "@/shared/lib/app-state/contracts/app-input";
import { createMessengerId } from "@/shared/lib/messenger-values/id";
export function createAppDataBridge(store: ReturnType<typeof createStore>): AppDataBridge {
  return {
    getCredentials: () => store.get(credentialsAtom),
    setCredentials: (value) => store.set(credentialsAtom, value),
    getActiveChat: () => store.get(activeChatAtom),
    setActiveChat: (value) => {
      const chat = value ? createChatSummary(value) : null;
      if (store.get(activeChatAtom)?.chatId !== chat?.chatId) {
        store.set(messagesAtom, []);
        store.set(messageDraftAtom, "");
      }
      store.set(activeChatAtom, chat);
    },
    upsertMessage: (value) => {
      if (value.chatId !== store.get(activeChatAtom)?.chatId) return;
      const message = createChatMessage(value);
      store.set(messagesAtom, (messages) => {
        const merged = new Map(messages.map((item) => [item.id, item]));
        const previous = merged.get(message.id);
        merged.set(
          message.id,
          previous?.status === MessageStatus.SENT
            ? { ...message, status: MessageStatus.SENT }
            : message,
        );
        return [...merged.values()];
      });
    },
    markSent: (chatId, localId, serverId) => {
      if (chatId !== store.get(activeChatAtom)?.chatId) return;
      const server = createMessengerId(serverId);
      store.set(messagesAtom, (messages) => {
        const optimistic = messages.find((item) => item.id === localId);
        if (!optimistic) return messages;
        const confirmed = messages.find((item) => item.id === serverId && item.id !== localId);
        const sent = { ...(confirmed ?? optimistic), id: server, status: MessageStatus.SENT };
        return messages
          .filter((item) => item.id !== serverId || item.id === localId)
          .map((item) => (item.id === localId ? sent : item));
      });
    },
    markFailed: (chatId, localId) => {
      if (chatId !== store.get(activeChatAtom)?.chatId) return;
      store.set(messagesAtom, (messages) =>
        messages.map((item) =>
          item.id === localId && item.status !== MessageStatus.SENT
            ? { ...item, status: MessageStatus.FAILED }
            : item,
        ),
      );
    },
    getDraft: () => store.get(messageDraftAtom),
    setDraft: (value) => store.set(messageDraftAtom, value),
    clearSession: () => {
      store.set(credentialsAtom, null);
      store.set(activeChatAtom, null);
      store.set(messagesAtom, []);
      store.set(messageDraftAtom, "");
    },
  };
}
