import type { GuardArgs } from "xstate";

import type { AppWorkflowContext, WorkflowEvent } from "../types";
import { AppProtocol } from "./app-protocol";

export const isCurrentFatalEvent = ({
  context,
  event,
}: GuardArgs<AppWorkflowContext, WorkflowEvent>) =>
  event.type === AppProtocol.event.SESSION_FATAL && !!context.owner?.isFatalCurrent(event);

export const hasLiveSession = ({ context }: GuardArgs<AppWorkflowContext, WorkflowEvent>) =>
  !!context.owner?.getSession();
