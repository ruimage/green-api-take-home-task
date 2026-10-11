import type { MessengerCredentialsDto } from "@/shared/service/messenger/dto";

export function parseDevConnectionConfig(values: {
  idInstance?: string;
  apiTokenInstance?: string;
  apiUrl?: string;
}) {
  const idInstance = values.idInstance?.trim();
  const apiTokenInstance = values.apiTokenInstance?.trim();
  if (!idInstance || !apiTokenInstance) {
    throw new Error(
      "Заполните BUN_PUBLIC_GREEN_API_ID_INSTANCE и BUN_PUBLIC_GREEN_API_API_TOKEN_INSTANCE в .env.dev.",
    );
  }

  let url: URL;
  try {
    url = new URL(values.apiUrl?.trim() || "https://api.green-api.com");
  } catch {
    throw new Error("BUN_PUBLIC_GREEN_API_API_URL должен содержать абсолютный HTTP(S) URL.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "BUN_PUBLIC_GREEN_API_API_URL должен быть HTTP(S) URL без credentials, query и fragment.",
    );
  }

  const credentials: MessengerCredentialsDto = { idInstance, apiTokenInstance };
  return { credentials, apiUrl: url.href.replace(/\/+$/, "") };
}

export function readDevConnectionConfig() {
  if (process.env.NODE_ENV !== "development") return null;

  const values = {
    idInstance: optionalDevValue(() => process.env.BUN_PUBLIC_GREEN_API_ID_INSTANCE),
    apiTokenInstance: optionalDevValue(() => process.env.BUN_PUBLIC_GREEN_API_API_TOKEN_INSTANCE),
    apiUrl: optionalDevValue(() => process.env.BUN_PUBLIC_GREEN_API_API_URL),
  };
  if (!values.idInstance?.trim() && !values.apiTokenInstance?.trim()) return null;
  return parseDevConnectionConfig(values);
}

function optionalDevValue(read: () => string | undefined) {
  try {
    return read();
  } catch (error) {
    if (error instanceof ReferenceError) return undefined;
    throw error;
  }
}
