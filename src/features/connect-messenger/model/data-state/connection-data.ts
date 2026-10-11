import { atom } from "jotai";

import type { MessengerCredentialsDto } from "@/shared/service/messenger/dto";

export const credentialsAtom = atom<MessengerCredentialsDto | null>(null);

if (process.env.NODE_ENV === "development") {
  credentialsAtom.debugLabel = "connectMessenger.credentials";
}
