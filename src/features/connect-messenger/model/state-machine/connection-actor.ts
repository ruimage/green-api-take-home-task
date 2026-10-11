import { fromPromise } from "xstate";

import type { AppSession } from "@/shared/lib/app-state/contracts/app-input";
import {
  assertNotAborted,
  requireInput,
} from "@/shared/lib/app-state/model/state-machine/actor-helpers";
import { WorkflowStage } from "@/shared/lib/app-state/model/state-machine/app-constants";
import { toWorkflowError } from "@/shared/lib/app-state/model/state-machine/app-errors";
import type {
  ConnectionActorInput,
  ConnectionActorResult,
} from "@/shared/lib/app-state/model/types";
export const connectionActor = fromPromise<ConnectionActorResult, ConnectionActorInput | null>(
  async ({ input: providedInput, signal }) => {
    const input = requireInput(providedInput, WorkflowStage.CONNECTION);
    let session: AppSession | undefined;
    const releaseSession = () => {
      if (session) {
        input.owner.disposeSession(session);
      }
    };
    signal.addEventListener("abort", releaseSession, { once: true });
    try {
      assertNotAborted(signal);
      if (!input.owner.isAttemptCurrent(input.attemptId)) {
        throw new DOMException("Операция отменена.", "AbortError");
      }
      session = input.sessions.create(input.credentials);
      assertNotAborted(signal);
      input.owner.register(session, input.attemptId);
      await session.dependencies.messenger.validateConnection(signal);
      assertNotAborted(signal);
      if (!input.owner.isAttemptCurrent(input.attemptId) || input.owner.getSession() !== session) {
        throw new DOMException("Операция отменена.", "AbortError");
      }
      return { attemptId: input.attemptId, session };
    } catch (error) {
      releaseSession();
      throw toWorkflowError(error, WorkflowStage.CONNECTION);
    } finally {
      signal.removeEventListener("abort", releaseSession);
    }
  },
);
