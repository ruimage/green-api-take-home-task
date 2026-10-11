import type { MessengerCredentialsDto } from "@/shared/service/messenger/dto";

import type { AppMachineInput, AppSession } from "../contracts/app-input";
import { FatalSource, WorkflowStage } from "../model/state-machine/app-constants";
import { toWorkflowError } from "../model/state-machine/app-errors";
import type { WorkflowError } from "../model/state-machine/app-errors";
import type { SessionFatalEvent } from "../model/types";
import type { OperationKey } from "./types";

export class AppRuntimeOwner {
  readonly input: AppMachineInput;
  private session: AppSession | null = null;
  private attemptId = 0;
  private attemptActive = false;
  private operationId = 0;
  private notificationCounter = 0;
  private notificationGeneration: number | null = null;
  private readonly sends = new Map<string, AbortController | undefined>();
  private readonly disposedSessions = new WeakSet<AppSession>();
  private stopped = false;
  cleanupError: WorkflowError | null = null;

  constructor(input: AppMachineInput) {
    this.input = input;
  }

  resume(): boolean {
    if (!this.stopped) {
      return false;
    }
    this.stopped = false;
    return true;
  }

  beginAttempt(): number {
    if (this.stopped) {
      throw toWorkflowError(undefined, WorkflowStage.CONNECTION);
    }
    this.cleanupError = null;
    this.endSession(true);
    this.attemptId += 1;
    this.attemptActive = true;
    return this.attemptId;
  }

  isAttemptCurrent(attemptId: number): boolean {
    return !this.stopped && this.attemptActive && attemptId === this.attemptId;
  }

  register(session: AppSession, attemptId: number): void {
    if (
      !this.isAttemptCurrent(attemptId) ||
      this.session !== null ||
      this.disposedSessions.has(session)
    ) {
      throw toWorkflowError(undefined, WorkflowStage.CONNECTION);
    }
    this.session = session;
  }

  getSession(): AppSession | null {
    return this.session;
  }

  nextOperation(): OperationKey {
    if (!this.session || !this.attemptActive || this.stopped) {
      throw toWorkflowError(undefined, WorkflowStage.CONNECTION);
    }
    this.operationId += 1;
    return { sessionId: this.session.id, operationId: this.operationId };
  }

  captureOperation(): OperationKey {
    return this.nextOperation();
  }

  invalidateOperation(): void {
    this.operationId += 1;
  }

  isCurrent(key: OperationKey): boolean {
    return (
      !this.stopped &&
      this.attemptActive &&
      this.session?.id === key.sessionId &&
      this.operationId === key.operationId
    );
  }

  beginNotification(): number {
    if (!this.session || !this.attemptActive || this.stopped) {
      throw toWorkflowError(undefined, WorkflowStage.CONNECTION);
    }
    this.notificationCounter += 1;
    this.notificationGeneration = this.notificationCounter;
    return this.notificationCounter;
  }

  endNotification(generation: number): void {
    if (this.notificationGeneration === generation) {
      this.notificationGeneration = null;
    }
  }

  getNotificationGeneration(): number | null {
    return this.notificationGeneration;
  }

  registerSend(localId: string, controller?: AbortController): string {
    if (!this.session || !this.attemptActive || this.stopped || this.sends.has(localId)) {
      throw toWorkflowError(undefined, WorkflowStage.CONNECTION);
    }
    this.sends.set(localId, controller);
    return this.session.id;
  }

  finishSend(localId: string): void {
    this.sends.delete(localId);
  }

  private cancelSends(): void {
    const controllers = [...this.sends.values()];
    this.sends.clear();
    controllers.forEach((controller) => controller?.abort());
  }

  isSendCurrent(sessionId: string, localId: string): boolean {
    return (
      !this.stopped &&
      this.attemptActive &&
      this.session?.id === sessionId &&
      this.sends.has(localId)
    );
  }

  isFatalCurrent(event: SessionFatalEvent): boolean {
    if (this.stopped || !this.attemptActive || this.session?.id !== event.sessionId) {
      return false;
    }
    return event.source === FatalSource.NOTIFICATION
      ? event.generation === this.notificationGeneration
      : true;
  }

  disposeSession(session: AppSession): void {
    if (this.session === session) {
      this.session = null;
      this.invalidateOperation();
      this.notificationGeneration = null;
      this.cancelSends();
    }
    if (this.disposedSessions.has(session)) {
      return;
    }
    this.disposedSessions.add(session);
    try {
      session.dispose();
    } catch (error) {
      this.cleanupError = toWorkflowError(error, WorkflowStage.CONNECTION);
    }
  }

  endSession(preserveCredentials = false): void {
    let credentials: MessengerCredentialsDto | null = null;
    if (preserveCredentials) {
      try {
        credentials = this.input.data.getCredentials();
      } catch (error) {
        this.cleanupError = toWorkflowError(error, WorkflowStage.CONNECTION);
      }
    }
    const session = this.session;
    this.session = null;
    this.attemptActive = false;
    this.attemptId += 1;
    this.invalidateOperation();
    this.notificationGeneration = null;
    this.cancelSends();
    if (session) {
      this.disposeSession(session);
    }
    try {
      this.input.data.clearSession();
    } catch (error) {
      this.cleanupError = toWorkflowError(error, WorkflowStage.CONNECTION);
    }
    if (preserveCredentials) {
      try {
        this.input.data.setCredentials(credentials);
      } catch (error) {
        this.cleanupError = toWorkflowError(error, WorkflowStage.CONNECTION);
      }
    }
  }

  stop(): void {
    if (this.stopped) {
      return;
    }
    this.stopped = true;
    this.endSession();
  }
}
