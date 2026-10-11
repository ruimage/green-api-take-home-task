import { fromPromise } from "xstate";

import {
  requireInput,
  assertCurrent,
} from "@/shared/lib/app-state/model/state-machine/actor-helpers";
import { WorkflowStage } from "@/shared/lib/app-state/model/state-machine/app-constants";
import { toWorkflowError } from "@/shared/lib/app-state/model/state-machine/app-errors";
import type { PhoneActorInput, ActorResult } from "@/shared/lib/app-state/model/types";
import type { ChatSummaryDto } from "@/shared/service/messenger/dto";
export const resolvePhoneChatActor = fromPromise<
  ActorResult<ChatSummaryDto>,
  PhoneActorInput | null
>(async ({ input: providedInput, signal }) => {
  const input = requireInput(providedInput, WorkflowStage.PHONE);
  try {
    assertCurrent(input, signal);
    const value = await input.session.dependencies.messenger.resolvePhoneChat(input.phone, signal);
    assertCurrent(input, signal);
    return { key: input.key, value };
  } catch (error) {
    throw toWorkflowError(error, WorkflowStage.PHONE);
  }
});
