import type { AppSessionFactory } from "@/shared/lib/app-state/contracts/app-input";
import { GreenApiRestMessengerService } from "@/shared/lib/green-api-rest/GreenApiRestMessengerService";
import type { RestOptions } from "@/shared/lib/green-api-rest/types";

export function createRestSessionFactory(
  options: RestOptions | (() => RestOptions) = {},
): AppSessionFactory {
  return {
    create(credentials) {
      const id = crypto.randomUUID();
      const messenger = new GreenApiRestMessengerService(
        credentials,
        typeof options === "function" ? options() : options,
      );
      return { id, dependencies: { messenger }, dispose: () => messenger.dispose() };
    },
  };
}
