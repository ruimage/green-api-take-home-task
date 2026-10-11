import { normalizeApiUrl, requestGreenApi } from "@/shared/lib/green-api/http-client";
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

import type { RestOptions } from "./types";

export class GreenApiRestMessengerService implements MessengerService {
  private readonly lifetime = new AbortController();
  private readonly credentials: MessengerCredentialsDto;
  private readonly options: RestOptions;
  private receiveTail: Promise<unknown> = Promise.resolve();

  constructor(credentials: MessengerCredentialsDto, options: RestOptions = {}) {
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

  private request(
    method: "get" | "post" | "delete",
    endpoint: string,
    signal?: AbortSignal,
    data?: unknown,
    query?: Record<string, string | number>,
    receiptId?: string,
  ) {
    const combined = signal
      ? AbortSignal.any([signal, this.lifetime.signal])
      : this.lifetime.signal;
    return requestGreenApi<unknown>(
      this.credentials,
      this.options,
      combined,
      method,
      endpoint,
      data,
      query,
      receiptId,
    );
  }

  async validateConnection(signal?: AbortSignal): Promise<void> {
    const state = record(await this.request("get", "getStateInstance", signal)).stateInstance;
    if (state === "authorized") return;
    if (state === "notAuthorized" || state === "blocked") throw new MessengerUnauthorizedError();
    if (state === "starting" || state === "yellowCard") throw new MessengerConnectionError();
    throw new MessengerUnknownError();
  }

  async sendMessage(chatId: string, text: string, signal?: AbortSignal) {
    const response = record(
      await this.request("post", "sendMessage", signal, { chatId, message: text }),
    );
    return { id: requiredString(response.idMessage) };
  }

  receiveNotification(signal?: AbortSignal) {
    const pending = this.receiveTail.then(async () =>
      mapNotification(
        await this.request("get", "receiveNotification", signal, undefined, { receiveTimeout: 5 }),
      ),
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
    if (
      record(
        await this.request(
          "delete",
          "deleteNotification",
          signal,
          undefined,
          undefined,
          String(receiptId),
        ),
      ).result !== true
    )
      throw new MessengerUnknownError();
  }

  async resolvePhoneChat(phone: string, signal?: AbortSignal) {
    const digits = phone.startsWith("+") ? phone.slice(1) : phone;
    if (!/^[1-9]\d{9,14}$/.test(digits)) throw new MessengerUnknownError();
    const result = record(
      await this.request("post", "checkWhatsapp", signal, {
        phoneNumber: Number(digits),
      }),
    );
    if (result.existsWhatsapp !== true) throw new MessengerUnknownError();
    const chatId = `${digits}@c.us`;
    return { id: chatId, chatId, displayName: `+${digits}` };
  }
}
