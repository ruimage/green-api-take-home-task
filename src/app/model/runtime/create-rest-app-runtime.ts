import type { RestOptions } from "@/shared/lib/green-api-rest/types";

import { createRestSessionFactory } from "./create-rest-session-factory";
import { createRuntimeWithSessions } from "./create-runtime-with-sessions";

export function createRestAppRuntime(options: RestOptions = {}) {
  return createRuntimeWithSessions(createRestSessionFactory(options));
}
