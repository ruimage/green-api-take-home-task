import { createActor, matchesState } from "xstate";
import type { ActorOptions } from "xstate";

import { session } from "@/features/connect-messenger";
import { conversation } from "@/features/send-message";
import { navigation } from "@/features/start-chat";
import type { AppMachineInput } from "@/shared/lib/app-state/contracts/app-input";
import type { SessionFatalEvent, AppPublicEvent } from "@/shared/lib/app-state/model/types";
import { AppRuntimeOwner } from "@/shared/lib/app-state/runtime/app-runtime";

import type { AppActors } from "../types";
import type { AppActorRef } from "../types";
import { appMachine } from "./app-machine";
import { app } from "./app-vocabulary";

export function createAppActor(
  input: AppMachineInput | null,
  inspect?: ActorOptions<typeof appMachine>["inspect"],
) {
  const owner = input ? new AppRuntimeOwner(input) : null;
  let ref: AppActorRef | null = null;
  const actor = createActor(appMachine, {
    input: {
      dependencies: input,
      owner,
      canConnect: () =>
        matchesState(app.state.OPENED, ref?.getSnapshot().value ?? app.state.COLLAPSED),
    },
    inspect,
  });
  ref = actor;
  return actor;
}

export function readAppActors(actor: AppActorRef): AppActors {
  const children = actor.getSnapshot().children;
  return {
    app: actor,
    session: children[app.child.SESSION] as AppActors["session"],
    navigation: children[app.child.NAVIGATION] as AppActors["navigation"],
    conversation: children[app.child.CONVERSATION] as AppActors["conversation"],
  };
}

export function sendAppEvent(actor: AppActorRef, event: AppPublicEvent | SessionFatalEvent) {
  if (event.type === app.event.OPEN || event.type === app.event.CLOSE) {
    actor.send(event);
    return;
  }
  const actors = readAppActors(actor);
  const sessionActor = actors.session;
  if (!matchesState(app.state.OPENED, actor.getSnapshot().value) || !sessionActor) return;
  if (
    event.type === session.event.CONNECT ||
    event.type === session.event.DISCONNECT ||
    event.type === session.event.SESSION_FATAL
  ) {
    sessionActor.send(event);
  } else if (
    event.type === session.event.RETRY &&
    sessionActor.getSnapshot().matches(session.state.FAILED)
  ) {
    sessionActor.send(event);
  } else if (sessionActor.getSnapshot().matches(session.state.READY)) {
    if (event.type === conversation.event.SEND_MESSAGE) {
      actors.conversation?.send(event);
      return;
    }
    if (event.type === navigation.event.OPEN_CHAT) actors.navigation?.send(event);
  }
}
