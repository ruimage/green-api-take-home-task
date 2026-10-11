import type { ChatSummaryDto, MessengerNotificationDto, SendMessageResultDto } from "./dto";

export interface MessengerService {
  validateConnection(signal?: AbortSignal): Promise<void>;
  sendMessage(chatId: string, text: string, signal?: AbortSignal): Promise<SendMessageResultDto>;
  receiveNotification(signal?: AbortSignal): Promise<MessengerNotificationDto | null>;
  acknowledgeNotification(receiptId: string | number, signal?: AbortSignal): Promise<void>;
  resolvePhoneChat(phone: string, signal?: AbortSignal): Promise<ChatSummaryDto>;
}
