import type { AppRuntimeOptions } from "../types";
import { createRestAppRuntime } from "./create-rest-app-runtime";
import { createRuntimeWithSessions } from "./create-runtime-with-sessions";
import { createSdkSessionFactory } from "./create-sdk-session-factory";

export function createAppRuntime(options: AppRuntimeOptions = {}) {
  return options.adapter === "rest"
    ? createRestAppRuntime(options)
    : createRuntimeWithSessions(createSdkSessionFactory(options));
}
