import { atom, useAtom, useAtomValue } from "jotai";

import { normalizeApiUrl } from "@/shared/lib/green-api/http-client";

export const configuredApiUrlAtom = atom<string | undefined>("https://api.green-api.com");
export const apiUrlDraftAtom = atom("");

export function validateApiUrl(value: string): string | null {
  if (!value.trim()) return "Введите ApiUrl.";
  try {
    normalizeApiUrl(value.trim());
    return null;
  } catch {
    return "Введите абсолютный HTTP(S) URL без логина, пароля, query и fragment.";
  }
}

export function useConnectionApiUrl() {
  const configuredApiUrl = useAtomValue(configuredApiUrlAtom);
  const [apiUrl, setApiUrl] = useAtom(apiUrlDraftAtom);
  return { apiUrl, setApiUrl, editable: configuredApiUrl === undefined };
}
