import { session } from "@/features/connect-messenger";
import { receiveNotifications } from "@/features/receive-messages";
import { conversation } from "@/features/send-message";
import { navigation } from "@/features/start-chat";
import { AppProtocol, AppShell } from "@/shared/lib/app-state/model/state-machine/app-protocol";

export const app = {
  id: "app",
  state: {
    COLLAPSED: AppShell.state.COLLAPSED,
    OPENED: AppShell.state.OPENED,
    GUEST: "guest",
    WORKFLOW: "workflow",
    CHATLESS: "chatless",
    CHAT: "chat",
  },
  stateId: {
    APP_ROOT: "app",
    COLLAPSED: "app.collapsed",
    OPENED: "app.opened",
    GUEST: "app.opened.guest",
    WORKFLOW: "app.opened.workflow",
    CHATLESS: "app.opened.workflow.chatless",
    CHAT: "app.opened.workflow.chat",
  },
  target: {
    COLLAPSED: "#app.collapsed",
    OPENED: "#app.opened",
    GUEST: "#app.opened.guest",
    WORKFLOW: "#app.opened.workflow",
    CHATLESS: "#app.opened.workflow.chatless",
    CHAT: "#app.opened.workflow.chat",
  },
  child: {
    SESSION: session.id,
    NAVIGATION: navigation.id,
    CONVERSATION: conversation.id,
    NOTIFICATIONS: receiveNotifications.id,
  },
  actor: {
    SESSION: "sessionMachine",
    NAVIGATION: "chatNavigationMachine",
    CONVERSATION: "chatConversationMachine",
    NOTIFICATIONS: "receiveMessagesMachine",
  },
  event: {
    OPEN: AppShell.event.OPEN,
    CLOSE: AppShell.event.CLOSE,
    SESSION_READY: AppProtocol.event.SESSION_READY,
    SESSION_ENDED: AppProtocol.event.SESSION_ENDED,
    CHAT_OPENED: AppProtocol.event.CHAT_OPENED,
    CHAT_CLOSED: AppProtocol.event.CHAT_CLOSED,
    SESSION_FATAL: AppProtocol.event.SESSION_FATAL,
    WORKFLOW_FAILED: AppProtocol.event.WORKFLOW_FAILED,
  },
  projection: {
    SESSION: "session",
    DISCONNECTED: "disconnected",
  },
} as const;
