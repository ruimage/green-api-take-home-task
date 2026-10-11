import type { AppSessionFactory } from "@/shared/lib/app-state/contracts/app-input";
import { GreenApiSdkMessengerService } from "@/shared/lib/green-api-sdk/GreenApiSdkMessengerService";
import type { SdkOptions } from "@/shared/lib/green-api-sdk/sdk-client";

export function createSdkSessionFactory(options: SdkOptions = {}): AppSessionFactory {
  return {
    create(credentials) {
      const id = crypto.randomUUID();
      const messenger = new GreenApiSdkMessengerService(credentials, options);
      return { id, dependencies: { messenger }, dispose: () => messenger.dispose() };
    },
  };
}
