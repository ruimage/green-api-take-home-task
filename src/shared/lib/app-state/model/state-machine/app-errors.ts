import {
  MessengerConnectionError,
  MessengerNetworkError,
  MessengerRateLimitError,
  MessengerUnauthorizedError,
} from "@/shared/service/messenger/errors";

import type { WorkflowErrorStage, WorkflowRecovery, SafeMessengerFailure } from "../types";
import { FailureKind, WorkflowRecovery as Recovery, WorkflowStage } from "./app-constants";

const safeMessages: Record<SafeMessengerFailure["kind"], string> = {
  [FailureKind.CONNECTION]: "Не удалось подключиться к сервису.",
  [FailureKind.UNAUTHORIZED]: "Подключение не авторизовано.",
  [FailureKind.RATE_LIMIT]: "Слишком много запросов. Попробуйте позже.",
  [FailureKind.NETWORK]: "Ошибка сети. Проверьте подключение.",
  [FailureKind.UNKNOWN]: "Не удалось выполнить операцию.",
};

export class WorkflowError extends Error implements SafeMessengerFailure {
  readonly kind: SafeMessengerFailure["kind"];
  readonly stage: WorkflowErrorStage;
  readonly recovery: WorkflowRecovery;

  constructor(
    stage: WorkflowErrorStage,
    kind: SafeMessengerFailure["kind"],
    recovery: WorkflowRecovery,
  ) {
    super(safeMessages[kind]);
    this.name = "WorkflowError";
    this.kind = kind;
    this.stage = stage;
    this.recovery = recovery;
  }
}

export function toWorkflowError(error: unknown, stage: WorkflowErrorStage): WorkflowError {
  let kind: SafeMessengerFailure["kind"] = FailureKind.UNKNOWN;
  if (error instanceof WorkflowError) {
    kind = error.kind;
  } else if (error instanceof MessengerUnauthorizedError) {
    kind = FailureKind.UNAUTHORIZED;
  } else if (error instanceof MessengerConnectionError) {
    kind = FailureKind.CONNECTION;
  } else if (error instanceof MessengerRateLimitError) {
    kind = FailureKind.RATE_LIMIT;
  } else if (error instanceof MessengerNetworkError) {
    kind = FailureKind.NETWORK;
  } else if (
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    (error.kind === FailureKind.CONNECTION ||
      error.kind === FailureKind.UNAUTHORIZED ||
      error.kind === FailureKind.RATE_LIMIT ||
      error.kind === FailureKind.NETWORK ||
      error.kind === FailureKind.UNKNOWN)
  ) {
    kind = error.kind;
  }

  const recovery =
    error instanceof WorkflowError && error.stage === stage
      ? error.recovery
      : kind === FailureKind.UNAUTHORIZED ||
          (kind === FailureKind.CONNECTION && stage !== WorkflowStage.CONNECTION)
        ? Recovery.RECONNECT_SESSION
        : kind === FailureKind.UNKNOWN
          ? Recovery.BACK_ONLY
          : Recovery.RETRY;

  return new WorkflowError(stage, kind, recovery);
}
