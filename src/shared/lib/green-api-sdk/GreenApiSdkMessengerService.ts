import {
  mapNotification,
  record,
  requiredString,
} from "@/shared/lib/green-api/notification-mappers";
import type { MessengerCredentialsDto } from "@/shared/service/messenger/dto";
import {
  MessengerConnectionError,
  MessengerUnauthorizedError,
  MessengerUnknownError,
} from "@/shared/service/messenger/errors";
import type { MessengerService } from "@/shared/service/messenger/MessengerService";

import { normalizeApiUrl, SafeGreenApiClient } from "./sdk-client";
import type { SdkOptions } from "./sdk-client";

const InstanceState = {
  AUTHORIZED: "authorized",
  NOT_AUTHORIZED: "notAuthorized",
  BLOCKED: "blocked",
  STARTING: "starting",
  YELLOW_CARD: "yellowCard",
} as const;

export class GreenApiSdkMessengerService implements MessengerService {
  private readonly lifetime = new AbortController();
  private readonly credentials: MessengerCredentialsDto;
  private readonly options: SdkOptions;
  private receiveTail: Promise<unknown> = Promise.resolve();

  constructor(credentials: MessengerCredentialsDto, options: SdkOptions = {}) {
    if (
      !/^\d+$/.test(credentials.idInstance) ||
      BigInt(credentials.idInstance) <= 0n ||
      !credentials.apiTokenInstance.trim()
    )
      throw new MessengerConnectionError();
    if (
      options.requestTimeoutMs !== undefined &&
      (!Number.isFinite(options.requestTimeoutMs) || options.requestTimeoutMs <= 0)
    )
      throw new MessengerConnectionError();
    this.credentials = { ...credentials };
    this.options = { ...options, apiUrl: normalizeApiUrl(options.apiUrl) };
  }

  dispose(): void {
    this.lifetime.abort();
  }

  private client(signal?: AbortSignal) {
    const combined = signal
      ? AbortSignal.any([signal, this.lifetime.signal])
      : this.lifetime.signal;
    if (combined.aborted) throw new DOMException("Операция отменена.", "AbortError");
    return new SafeGreenApiClient(this.credentials, this.options, combined);
  }

  async validateConnection(signal?: AbortSignal): Promise<void> {
    const state = record(await this.client(signal).getStateInstance()).stateInstance;
    if (state === InstanceState.AUTHORIZED) return;
    if (state === InstanceState.NOT_AUTHORIZED || state === InstanceState.BLOCKED)
      throw new MessengerUnauthorizedError();
    if (state === InstanceState.STARTING || state === InstanceState.YELLOW_CARD)
      throw new MessengerConnectionError();
    throw new MessengerUnknownError();
  }
  async sendMessage(chatId: string, text: string, signal?: AbortSignal) {
    const response = record(await this.client(signal).sendMessage({ chatId, message: text }));
    return { id: requiredString(response.idMessage) };
  }
  receiveNotification(signal?: AbortSignal) {
    const pending = this.receiveTail.then(async () =>
      mapNotification(await this.client(signal).receiveNotification(5)),
    );
    this.receiveTail = pending.catch(() => undefined);
    return pending;
  }
  async acknowledgeNotification(receiptId: string | number, signal?: AbortSignal): Promise<void> {
    if (
      !/^\d+$/.test(String(receiptId)) ||
      BigInt(receiptId) <= 0n ||
      (typeof receiptId === "number" && !Number.isSafeInteger(receiptId))
    )
      throw new MessengerUnknownError();
    if (record(await this.client(signal).acknowledge(receiptId)).result !== true)
      throw new MessengerUnknownError();
  }
  async resolvePhoneChat(phone: string, signal?: AbortSignal) {
    const digits = phone.startsWith("+") ? phone.slice(1) : phone;
    if (!/^[1-9]\d{9,14}$/.test(digits)) throw new MessengerUnknownError();
    const result = record(await this.client(signal).checkWhatsapp({ phoneNumber: Number(digits) }));
    if (result.existsWhatsapp !== true) throw new MessengerUnknownError();
    const chatId = `${digits}@c.us`;
    return { id: chatId, chatId, displayName: `+${digits}` };
  }
}
