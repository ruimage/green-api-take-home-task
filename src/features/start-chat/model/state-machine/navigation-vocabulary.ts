import { AppProtocol } from "@/shared/lib/app-state/model/state-machine/app-protocol";

export const navigation = {
  id: "chatNavigation",
  state: {
    IDLE: "idle",
    EDITING: "editing",
    RESOLVING: "resolving",
    CONVERSATION: "conversation",
  },
  stateId: {
    IDLE: "navigationIdle",
    EDITING: "phoneEditing",
    RESOLVING: "phoneResolving",
    CONVERSATION: "navigationConversation",
  },
  target: {
    IDLE: "#navigationIdle",
    EDITING: "#phoneEditing",
    RESOLVING: "#phoneResolving",
    CONVERSATION: "#navigationConversation",
  },
  event: {
    OPEN_CHAT: "OPEN_CHAT",
    ACTIVATE: AppProtocol.event.ACTIVATE,
    DEACTIVATE: AppProtocol.event.DEACTIVATE,
    CHAT_OPENED: AppProtocol.event.CHAT_OPENED,
    CHAT_CLOSED: AppProtocol.event.CHAT_CLOSED,
    WORKFLOW_FAILED: AppProtocol.event.WORKFLOW_FAILED,
  },
  actor: {
    RESOLVE_PHONE_CHAT: "resolvePhoneChatActor",
  },
  actorId: {
    PHONE: "phone",
  },
  action: {
    BEGIN_OPERATION: "beginOperation",
    INVALIDATE_OPERATION: "invalidateOperation",
    SAVE_PHONE: "savePhone",
    RESET_WORKFLOW: "resetWorkflow",
  },
  guard: {
    VALID_PHONE: "validPhone",
  },
} as const;
