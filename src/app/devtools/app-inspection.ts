import type { createBrowserInspector, StatelyInspectionEvent } from "@statelyai/inspect";
import type { AnyEventObject, MachineContext, Snapshot } from "xstate";

import { session } from "@/features/connect-messenger";
import { conversation } from "@/features/send-message";
import { navigation } from "@/features/start-chat";
import {
  ActorEventPrefix,
  ActorStatus,
  FailureKind,
  FatalSource,
  InspectionEventType,
  WorkflowRecovery,
  WorkflowStage,
} from "@/shared/lib/app-state/model/state-machine/app-constants";
import { WorkflowError } from "@/shared/lib/app-state/model/state-machine/app-errors";
import type {
  SafeMessengerFailure,
  WorkflowErrorStage,
  WorkflowRecovery as WorkflowRecoveryType,
} from "@/shared/lib/app-state/model/types";

import { app } from "../model/state-machine/app-vocabulary";

type BrowserInspectorOptions = NonNullable<Parameters<typeof createBrowserInspector>[0]>;

const userEventTypes: ReadonlySet<string> = new Set([
  app.event.OPEN,
  app.event.CLOSE,
  session.event.CONNECT,
  session.event.DISCONNECT,
  navigation.event.OPEN_CHAT,
  session.event.RETRY,
  conversation.event.SEND_MESSAGE,
]);

export function filterAppInspection(event: StatelyInspectionEvent): boolean {
  return event.type !== InspectionEventType.EVENT || userEventTypes.has(event.event.type);
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function counter(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function safeError(value: unknown) {
  if (value === null || value === undefined) return null;
  const error = record(value);
  const kind: SafeMessengerFailure["kind"] =
    error.kind === FailureKind.CONNECTION ||
    error.kind === FailureKind.UNAUTHORIZED ||
    error.kind === FailureKind.RATE_LIMIT ||
    error.kind === FailureKind.NETWORK
      ? error.kind
      : FailureKind.UNKNOWN;
  const stage: WorkflowErrorStage | undefined =
    error.stage === WorkflowStage.CONNECTION ||
    error.stage === WorkflowStage.PHONE ||
    error.stage === WorkflowStage.RECEIVE ||
    error.stage === WorkflowStage.SEND
      ? error.stage
      : undefined;
  const recovery: WorkflowRecoveryType | undefined =
    error.recovery === WorkflowRecovery.RETRY ||
    error.recovery === WorkflowRecovery.BACK_ONLY ||
    error.recovery === WorkflowRecovery.RECONNECT_SESSION
      ? error.recovery
      : undefined;
  return {
    kind,
    message: new WorkflowError(
      stage ?? WorkflowStage.CONNECTION,
      kind,
      recovery ?? WorkflowRecovery.BACK_ONLY,
    ).message,
    ...(stage ? { stage } : {}),
    ...(recovery ? { recovery } : {}),
  };
}

function operation(value: unknown) {
  const operationId = counter(record(value).operationId);
  return operationId === undefined ? null : { operationId };
}

export function sanitizeAppEvent(event: AnyEventObject): AnyEventObject {
  const sanitized: AnyEventObject = { type: event.type };
  if (event.type === session.event.SESSION_FATAL) {
    if (event.source === FatalSource.SEND || event.source === FatalSource.NOTIFICATION)
      sanitized.source = event.source;
    const generation = counter(event.generation);
    if (generation !== undefined) sanitized.generation = generation;
    sanitized.error = safeError(event.error);
  }
  if (event.type.startsWith(ActorEventPrefix.ERROR)) sanitized.error = safeError(event.error);
  if (event.type.startsWith(ActorEventPrefix.DONE)) {
    const output = record(event.output);
    const attemptId = counter(output.attemptId);
    const key = operation(output.key);
    sanitized.output = {
      ...(attemptId !== undefined ? { attemptId } : {}),
      ...(key ? { key } : {}),
    };
  }
  return sanitized;
}

export function sanitizeAppContext(context: unknown): MachineContext {
  const value = record(context);
  return {
    attemptId: counter(value.attemptId),
    operation: operation(value.operation),
    hasSubmittedPhone:
      value.hasSubmittedPhone === true ||
      (typeof value.submittedPhone === "string" && value.submittedPhone.length > 0),
    error: safeError(value.error),
  };
}

function sanitizeSnapshot(value: unknown): Snapshot<unknown> & {
  context: MachineContext;
  value?: unknown;
  machine?: { id: string; definition: unknown };
} {
  const snapshot = record(value);
  const machine = record(snapshot.machine);
  const definition: unknown =
    typeof machine.id === "string" && typeof machine.definition === "object"
      ? JSON.parse(JSON.stringify(machine.definition))
      : undefined;
  const common = {
    value: snapshot.value,
    context: sanitizeAppContext(snapshot.context),
    ...(typeof machine.id === "string" && definition !== undefined
      ? { machine: { id: machine.id, definition } }
      : {}),
  };
  if (snapshot.status === ActorStatus.ERROR) {
    return {
      ...common,
      status: ActorStatus.ERROR,
      output: undefined,
      error: safeError(snapshot.error),
    };
  }
  return {
    ...common,
    status:
      snapshot.status === ActorStatus.DONE || snapshot.status === ActorStatus.STOPPED
        ? snapshot.status
        : ActorStatus.ACTIVE,
    output: undefined,
    error: undefined,
  };
}

export function serializeAppInspection(event: StatelyInspectionEvent): StatelyInspectionEvent {
  if (event.type === InspectionEventType.EVENT)
    return { ...event, event: sanitizeAppEvent(event.event) };
  if (event.type === InspectionEventType.SNAPSHOT) {
    return {
      ...event,
      event: sanitizeAppEvent(event.event),
      snapshot: sanitizeSnapshot(event.snapshot),
    };
  }
  return { ...event, snapshot: sanitizeSnapshot(event.snapshot) };
}

export const appInspectorOptions = {
  filter: filterAppInspection,
  sanitizeEvent: sanitizeAppEvent,
  sanitizeContext: sanitizeAppContext,
  serialize: serializeAppInspection,
} satisfies Pick<
  BrowserInspectorOptions,
  "filter" | "sanitizeEvent" | "sanitizeContext" | "serialize"
>;
