import type { MessengerCredentialsDto } from "@/shared/service/messenger/dto";
import {
  MessengerConnectionError,
  MessengerNetworkError,
  MessengerRateLimitError,
  MessengerUnauthorizedError,
  MessengerUnknownError,
} from "@/shared/service/messenger/errors";

import type { GreenApiOptions } from "./types";

export function normalizeApiUrl(value = "https://api.green-api.com"): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new MessengerConnectionError();
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new MessengerConnectionError();
  return url.href.replace(/\/+$/, "");
}

export async function requestGreenApi<T>(
  credentials: MessengerCredentialsDto,
  options: GreenApiOptions,
  callerSignal: AbortSignal,
  method: "get" | "post" | "delete",
  endpoint: string,
  data?: unknown,
  queryParams?: Record<string, string | number>,
  pathAfterToken?: string,
): Promise<T> {
  if (callerSignal.aborted) throw new DOMException("Операция отменена.", "AbortError");
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), options.requestTimeoutMs ?? 15000);
  const signal = AbortSignal.any([callerSignal, timeout.signal]);
  try {
    const url = new URL(
      `${normalizeApiUrl(options.apiUrl)}/waInstance${credentials.idInstance}` +
        `/${endpoint}/${encodeURIComponent(credentials.apiTokenInstance)}` +
        (pathAfterToken ? `/${encodeURIComponent(pathAfterToken)}` : ""),
    );
    for (const [key, value] of Object.entries(queryParams ?? {}))
      url.searchParams.set(key, String(value));
    const response = await (options.fetch ?? globalThis.fetch)(url.href, {
      method: method.toUpperCase(),
      signal,
      headers: data === undefined ? undefined : { "Content-Type": "application/json" },
      body: data === undefined ? undefined : JSON.stringify(data),
      credentials: "omit",
      redirect: "error",
    });
    if (signal.aborted) throw new MessengerNetworkError();
    if (response.status === 401 || response.status === 403) throw new MessengerUnauthorizedError();
    if (response.status === 429) throw new MessengerRateLimitError();
    if (response.status >= 500) throw new MessengerNetworkError();
    if (!response.ok) throw new MessengerUnknownError();
    let result: unknown;
    try {
      const body = await response.text();
      result = !body.trim() && endpoint === "receiveNotification" ? null : JSON.parse(body);
    } catch {
      throw new MessengerUnknownError();
    }
    if (
      endpoint === "receiveNotification" &&
      result !== null &&
      (!result || typeof result !== "object" || Array.isArray(result))
    )
      throw new MessengerUnknownError();
    if (signal.aborted) throw new MessengerNetworkError();
    return result as T;
  } catch (error) {
    if (callerSignal.aborted) throw new DOMException("Операция отменена.", "AbortError");
    if (timeout.signal.aborted) throw new MessengerNetworkError();
    if (
      error instanceof MessengerUnauthorizedError ||
      error instanceof MessengerRateLimitError ||
      error instanceof MessengerNetworkError ||
      error instanceof MessengerUnknownError
    )
      throw error;
    throw new MessengerNetworkError();
  } finally {
    clearTimeout(timer);
  }
}
