import { fromPromise, sendParent, setup } from "xstate";

import {
  FatalSource,
  StateNodeType,
  WorkflowRecovery,
  WorkflowStage,
} from "@/shared/lib/app-state/model/state-machine/app-constants";
import { toWorkflowError } from "@/shared/lib/app-state/model/state-machine/app-errors";
import { createMessengerId } from "@/shared/lib/messenger-values/id";
import type { SendMessageResultDto } from "@/shared/service/messenger/dto";

import type { SendMachineInput } from "../types";
import { send } from "./send-vocabulary";

const isCurrent = (context: SendMachineInput) =>
  context.owner.isSendCurrent(context.session.id, context.localId);
const finished = sendParent(({ context }: { context: SendMachineInput }) => ({
  type: send.event.FINISHED,
  localId: context.localId,
}));

const requestSend = fromPromise<SendMessageResultDto, SendMachineInput>(
  async ({ input, signal }) => {
    const combinedSignal = AbortSignal.any([signal, input.controller.signal]);
    combinedSignal.throwIfAborted();
    const result = await input.session.dependencies.messenger.sendMessage(
      input.chatId,
      input.text,
      combinedSignal,
    );
    return { id: createMessengerId(result.id) };
  },
);

export const sendMachine = setup({
  types: { context: {} as SendMachineInput, input: {} as SendMachineInput },
  actors: {
    [send.actor.REQUEST]: requestSend,
  },
}).createMachine({
  id: send.id,
  context: ({ input }) => input,
  initial: send.state.SENDING,
  states: {
    [send.state.SENDING]: {
      invoke: {
        src: send.actor.REQUEST,
        input: ({ context }) => context,
        onDone: [
          {
            guard: ({ context }) => isCurrent(context),
            target: send.state.SENT,
            actions: ({ context, event }) =>
              context.owner.input.data.markSent(context.chatId, context.localId, event.output.id),
          },
          { target: send.state.CANCELLED },
        ],
        onError: [
          {
            guard: ({ context }) => !isCurrent(context),
            target: send.state.CANCELLED,
          },
          {
            guard: ({ event }) =>
              toWorkflowError(event.error, WorkflowStage.SEND).recovery ===
              WorkflowRecovery.RECONNECT_SESSION,
            target: send.state.FAILED,
            actions: sendParent(({ context, event }) => ({
              type: send.event.SESSION_FATAL,
              source: FatalSource.SEND,
              sessionId: context.session.id,
              localId: context.localId,
              error: toWorkflowError(event.error, WorkflowStage.SEND),
            })),
          },
          {
            target: send.state.FAILED,
            actions: ({ context }) =>
              context.owner.input.data.markFailed(context.chatId, context.localId),
          },
        ],
      },
    },
    [send.state.SENT]: { type: StateNodeType.FINAL, entry: finished },
    [send.state.FAILED]: { type: StateNodeType.FINAL, entry: finished },
    [send.state.CANCELLED]: { type: StateNodeType.FINAL, entry: finished },
  },
});
