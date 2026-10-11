import type { StateValue } from "xstate";

import type { MessengerCredentialsDto } from "@/shared/service/messenger/dto";

import type { AppMachineInput, AppSessionFactory, AppSession } from "../contracts/app-input";
import type { AppRuntimeOwner } from "../runtime/app-runtime";
import type { OperationKey } from "../runtime/types";
import type {
  WorkflowStage,
  WorkflowRecovery as Recovery,
  FailureKind,
  FatalSource,
} from "./state-machine/app-constants";
import type { WorkflowError } from "./state-machine/app-errors";

export type WorkflowErrorStage = (typeof WorkflowStage)[keyof typeof WorkflowStage];

export type ShellSnapshot = {
  value: StateValue;
  can(event: { type: string }): boolean;
};

export type WorkflowRecovery = (typeof Recovery)[keyof typeof Recovery];

export type SafeMessengerFailure = {
  kind: (typeof FailureKind)[keyof typeof FailureKind];
  message: string;
};

export type AppPublicEvent =
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "CONNECT"; credentials: MessengerCredentialsDto }
  | { type: "DISCONNECT" }
  | { type: "OPEN_CHAT"; phone: string }
  | { type: "RETRY" }
  | { type: "SEND_MESSAGE" };

export type AppWorkflowContext = {
  input: AppMachineInput | null;
  owner: AppRuntimeOwner | null;
  error: WorkflowError | null;
  attemptId: number;
  operation: OperationKey | null;
  submittedPhone: string | null;
  canConnect: (() => boolean) | undefined;
};

export type WorkflowEvent =
  | AppPublicEvent
  | SessionFatalEvent
  | { type: "ACTIVATE" }
  | { type: "DEACTIVATE" }
  | { type: "WORKFLOW_FAILED"; error: WorkflowError };

export type WorkflowActorInput = {
  dependencies: AppMachineInput | null;
  owner: AppRuntimeOwner | null;
  canConnect?: () => boolean;
};

export type SessionFatalEvent = {
  type: "SESSION_FATAL";
  sessionId: string;
  error: SafeMessengerFailure;
} & (
  | { source: typeof FatalSource.NOTIFICATION; generation: number }
  | { source: typeof FatalSource.SEND; localId: string }
);

export type ConnectionActorInput = {
  owner: AppRuntimeOwner;
  attemptId: number;
  credentials: MessengerCredentialsDto;
  sessions: AppSessionFactory;
};

export type ConnectionActorResult = { attemptId: number; session: AppSession };

export type ReadActorInput = {
  owner: AppRuntimeOwner;
  key: OperationKey;
  session: AppSession;
};

export type PhoneActorInput = ReadActorInput & { phone: string };

export type ActorResult<Value> = { key: OperationKey; value: Value };
