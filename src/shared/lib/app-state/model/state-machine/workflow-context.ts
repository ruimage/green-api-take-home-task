import type { AppWorkflowContext, WorkflowActorInput } from "../types";

export function createWorkflowContext(input: WorkflowActorInput | null): AppWorkflowContext {
  return {
    input: input?.dependencies ?? null,
    owner: input?.owner ?? null,
    error: null,
    attemptId: 0,
    operation: null,
    submittedPhone: null,
    canConnect: input?.canConnect,
  };
}
