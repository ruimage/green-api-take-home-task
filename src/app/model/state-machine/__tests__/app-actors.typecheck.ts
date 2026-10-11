import { createActor } from "xstate";

import { connectMessengerMachine, session } from "@/features/connect-messenger";
import { conversation, messageSendingMachine } from "@/features/send-message";
import { navigation, startChatMachine } from "@/features/start-chat";

import { appMachine } from "../app-machine";
import { app } from "../app-vocabulary";
export function checkMachineTypes() {
  const root = createActor(appMachine, { input: null });
  root.send({ type: app.event.OPEN });
  root.send({
    // @ts-expect-error
    type: session.event.CONNECT,
    credentials: { idInstance: "123", apiTokenInstance: "token" },
  });
  const sessionActor = createActor(connectMessengerMachine, { input: null });
  // @ts-expect-error
  sessionActor.send({ type: session.event.CONNECT });
  const navigationActor = createActor(startChatMachine, { input: null });
  // @ts-expect-error
  navigationActor.send({ type: navigation.event.OPEN_CHAT });
  const conversationActor = createActor(messageSendingMachine, { input: null });
  // @ts-expect-error
  conversationActor.send({ type: navigation.event.OPEN_CHAT, phone: "+12345678901" });
  conversationActor.send({ type: conversation.event.ACTIVATE });
}
