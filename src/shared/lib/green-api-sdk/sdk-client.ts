import { GreenApiClient } from "@green-api/whatsapp-api-client-js-v2";

import { normalizeApiUrl, requestGreenApi } from "@/shared/lib/green-api/http-client";
import type { GreenApiFetch, GreenApiOptions } from "@/shared/lib/green-api/types";
import type { MessengerCredentialsDto } from "@/shared/service/messenger/dto";

export { normalizeApiUrl };
export type SdkFetch = GreenApiFetch;
export type SdkOptions = GreenApiOptions;

export class SafeGreenApiClient extends GreenApiClient {
  constructor(
    credentials: MessengerCredentialsDto,
    private readonly options: SdkOptions,
    private readonly signal: AbortSignal,
  ) {
    super({
      idInstance: BigInt(credentials.idInstance),
      apiTokenInstance: credentials.apiTokenInstance,
    });
  }

  acknowledge(receiptId: string | number): Promise<unknown> {
    if (typeof receiptId === "number") return this.deleteNotification(receiptId);
    return this.makeRequest(
      "delete",
      "deleteNotification",
      undefined,
      undefined,
      undefined,
      String(receiptId),
    );
  }

  protected override async makeRequest<T>(
    method: "get" | "post" | "delete",
    endpoint: string,
    data?: unknown,
    queryParams?: Record<string, string | number>,
    _config?: unknown,
    pathAfterToken?: string,
  ): Promise<T> {
    return requestGreenApi<T>(
      {
        idInstance: String(this.instance.idInstance),
        apiTokenInstance: this.instance.apiTokenInstance,
      },
      this.options,
      this.signal,
      method,
      endpoint,
      data,
      queryParams,
      pathAfterToken,
    );
  }
}
