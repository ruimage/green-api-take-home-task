import type { AppRuntimeOptions } from "../types";
import { createRestSessionFactory } from "./create-rest-session-factory";
import { createRuntimeWithSessions } from "./create-runtime-with-sessions";
import { createSdkSessionFactory } from "./create-sdk-session-factory";

export function createAppRuntime(options: AppRuntimeOptions = {}) {
  return createRuntimeWithSessions(
    options.adapter === "rest"
      ? createRestSessionFactory(options)
      : createSdkSessionFactory(options),
  );
}
