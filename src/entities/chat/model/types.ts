import type { MessengerChatId } from "@/shared/lib/messenger-values/chat-id";
import type { MessengerId } from "@/shared/lib/messenger-values/id";
import type { MessengerTimestamp } from "@/shared/lib/messenger-values/timestamp";
import type { ChatMessageDto, ChatSummaryDto } from "@/shared/service/messenger/dto";

export type ChatSummary = Omit<ChatSummaryDto, "id" | "chatId"> & {
  id: MessengerId;
  chatId: MessengerChatId;
};

export type ChatMessage = Omit<ChatMessageDto, "id" | "chatId" | "timestamp"> & {
  id: MessengerId;
  chatId: MessengerChatId;
  timestamp: MessengerTimestamp;
};
