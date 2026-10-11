import type { ReadActorInput } from "../types";
import type { WorkflowErrorStage } from "../types";
import { FailureKind, WorkflowRecovery } from "./app-constants";
import { WorkflowError } from "./app-errors";

export function assertNotAborted(signal: AbortSignal): void {
  signal.throwIfAborted();
}

export function requireInput<Input>(input: Input | null, stage: WorkflowErrorStage): Input {
  if (input === null) {
    throw new WorkflowError(stage, FailureKind.CONNECTION, WorkflowRecovery.BACK_ONLY);
  }
  return input;
}

export function assertCurrent(
  input: Pick<ReadActorInput, "owner" | "key" | "session">,
  signal: AbortSignal,
): void {
  assertNotAborted(signal);
  if (!input.owner.isCurrent(input.key) || input.owner.getSession() !== input.session) {
    throw new DOMException("Операция отменена.", "AbortError");
  }
}
