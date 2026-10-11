import { createMessengerChatId } from "@/shared/lib/messenger-values/chat-id";
import { createMessengerId } from "@/shared/lib/messenger-values/id";
import { createMessengerTimestamp } from "@/shared/lib/messenger-values/timestamp";
import type { ChatMessageDto, ChatSummaryDto } from "@/shared/service/messenger/dto";

import type { ChatMessage, ChatSummary } from "./types";

export function createChatSummary(dto: ChatSummaryDto): ChatSummary {
  return { ...dto, id: createMessengerId(dto.id), chatId: createMessengerChatId(dto.chatId) };
}

export function createChatMessage(dto: ChatMessageDto): ChatMessage {
  return {
    ...dto,
    id: createMessengerId(dto.id),
    chatId: createMessengerChatId(dto.chatId),
    timestamp: createMessengerTimestamp(dto.timestamp),
  };
}
