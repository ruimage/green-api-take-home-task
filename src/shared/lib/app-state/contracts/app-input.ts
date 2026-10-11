import type {
  ChatMessageDto,
  ChatSummaryDto,
  MessengerCredentialsDto,
} from "@/shared/service/messenger/dto";
import type { MessengerService } from "@/shared/service/messenger/MessengerService";

export type AppDependencies = { messenger: MessengerService };

export type AppSession = {
  id: string;
  dependencies: AppDependencies;
  dispose(): void;
};

export interface AppSessionFactory {
  create(credentials: MessengerCredentialsDto): AppSession;
}

export interface AppDataBridge {
  getCredentials(): MessengerCredentialsDto | null;
  setCredentials(value: MessengerCredentialsDto | null): void;
  getActiveChat(): ChatSummaryDto | null;
  setActiveChat(value: ChatSummaryDto | null): void;
  upsertMessage(value: ChatMessageDto): void;
  markSent(chatId: string, localId: string, serverId: string): void;
  markFailed(chatId: string, localId: string): void;
  getDraft(): string;
  setDraft(value: string): void;
  clearSession(): void;
}

export type AppMachineInput = {
  sessions: AppSessionFactory;
  data: AppDataBridge;
};
