import { matchesState } from "xstate";
import type { StateValue } from "xstate";

import { session } from "@/features/connect-messenger";
import { conversation } from "@/features/send-message";
import { navigation } from "@/features/start-chat";
import type { AppMachineInput } from "@/shared/lib/app-state/contracts/app-input";
import { ActorStatus } from "@/shared/lib/app-state/model/state-machine/app-constants";
import { createWorkflowContext } from "@/shared/lib/app-state/model/state-machine/workflow-context";
import type {
  AppWorkflowContext,
  SessionFatalEvent,
  AppPublicEvent,
} from "@/shared/lib/app-state/model/types";

import type { AppActorRef } from "../../types";
import { createAppActor, readAppActors, sendAppEvent } from "../app-actors";
import { app } from "../app-vocabulary";

export function createAppTestActor(input: AppMachineInput) {
  const actor: AppActorRef = createAppActor(input);
  const testActor = {
    root: actor,
    start() {
      actor.start();
      return testActor;
    },
    stop() {
      actor.stop();
    },
    send(event: AppPublicEvent | SessionFatalEvent) {
      sendAppEvent(actor, event);
    },
    subscribe(observer: { error(error: unknown): void }) {
      return actor.subscribe(observer);
    },
    get actors() {
      return readAppActors(actor);
    },
    getSnapshot() {
      const shell = actor.getSnapshot();
      const {
        session: sessionRef,
        navigation: navigationRef,
        conversation: conversationRef,
      } = readAppActors(actor);
      const sessionSnapshot = sessionRef?.getSnapshot();
      const navigationSnapshot = navigationRef?.getSnapshot();
      const conversationSnapshot = conversationRef?.getSnapshot();
      let value: StateValue = app.state.COLLAPSED;
      let context: AppWorkflowContext = createWorkflowContext(null);
      if (shell.matches(app.state.OPENED) && sessionSnapshot) {
        context = sessionSnapshot.context;
        if (
          sessionSnapshot.matches(session.state.IDLE) ||
          sessionSnapshot.matches(session.state.FAILED)
        )
          value = { [app.state.OPENED]: { [app.projection.DISCONNECTED]: sessionSnapshot.value } };
        else if (sessionSnapshot.matches(session.state.CONNECTING))
          value = { [app.state.OPENED]: { [app.projection.SESSION]: session.state.CONNECTING } };
        else {
          const active = navigationSnapshot?.matches(navigation.state.CONVERSATION)
            ? (conversationSnapshot ?? navigationSnapshot)
            : navigationSnapshot;
          context = {
            ...(active?.context ?? sessionSnapshot.context),
            attemptId: sessionSnapshot.context.attemptId,
          };
          value = {
            [app.state.OPENED]: {
              [app.projection.SESSION]: active?.value ?? sessionSnapshot.value,
            },
          };
        }
      }
      const status = [shell, sessionSnapshot, navigationSnapshot, conversationSnapshot].some(
        (snapshot) => snapshot?.status === ActorStatus.ERROR,
      )
        ? ActorStatus.ERROR
        : shell.status;
      return {
        value,
        status,
        context: { ...context, owner: shell.context.owner },
        children: shell.children,
        matches: (path: StateValue) => matchesState(path, value),
        can: (event: AppPublicEvent) => {
          if (event.type === app.event.OPEN || event.type === app.event.CLOSE)
            return shell.can(event);
          if (!shell.matches(app.state.OPENED) || !sessionSnapshot) return false;
          if (event.type === session.event.CONNECT || event.type === session.event.DISCONNECT)
            return sessionSnapshot.can(event);
          if (sessionSnapshot.matches(session.state.FAILED))
            return event.type === session.event.RETRY ? sessionSnapshot.can(event) : false;
          if (event.type === conversation.event.SEND_MESSAGE)
            return conversationSnapshot?.can(event) ?? false;
          return event.type === navigation.event.OPEN_CHAT
            ? (navigationSnapshot?.can(event) ?? false)
            : false;
        },
      };
    },
  };
  return testActor;
}
