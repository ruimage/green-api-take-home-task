import { expect, test } from "bun:test";

import { createActor } from "xstate";

import { connectMessengerMachine, session } from "@/features/connect-messenger";
import { receiveMessagesMachine, receiveNotifications } from "@/features/receive-messages";
import { conversation, messageSendingMachine, send, sendMachine } from "@/features/send-message";
import { navigation, startChatMachine } from "@/features/start-chat";

import { appMachine } from "../app-machine";
import { app } from "../app-vocabulary";

const machines = [
  appMachine,
  connectMessengerMachine,
  startChatMachine,
  messageSendingMachine,
  receiveMessagesMachine,
];
const nodes = machines.flatMap((machine) => {
  const result: (typeof machine.root)[] = [];
  const visit = (node: typeof machine.root) => {
    result.push(node);
    Object.values(node.states).forEach(visit);
  };
  visit(machine.root);
  return result;
});
const maxDepth = new Map<(typeof machines)[number], number>([
  [appMachine, 3],
  [connectMessengerMachine, 1],
  [startChatMachine, 2],
  [messageSendingMachine, 2],
  [receiveMessagesMachine, 1],
]);

const catalogIds = [
  app.id,
  ...Object.values(app.stateId),
  session.id,
  ...Object.values(session.stateId),
  navigation.id,
  ...Object.values(navigation.stateId),
  conversation.id,
  ...Object.values(conversation.stateId),
  receiveNotifications.id,
];

const catalogTargets = [
  ...Object.values(app.target),
  ...Object.values(session.target),
  ...Object.values(navigation.target),
  ...Object.values(conversation.target),
];

const catalogActions = [
  ...Object.values(session.action),
  ...Object.values(navigation.action),
  ...Object.values(conversation.action),
];
const catalogGuards = [
  ...Object.values(session.guard),
  ...Object.values(navigation.guard),
  ...Object.values(conversation.guard),
];
const catalogActors = [
  ...Object.values(app.actor),
  ...Object.values(session.actor),
  ...Object.values(navigation.actor),
  ...Object.values(conversation.actor),
  ...Object.values(receiveNotifications.actor),
];

test("machine vocabulary covers every state node id without duplicates", () => {
  const ids = nodes.map((node) => node.id);
  expect(ids.sort()).toEqual([...new Set(catalogIds)].sort());
  expect(new Set(ids).size).toBe(ids.length);
});

test("every catalog target resolves in one owning machine", () => {
  for (const target of catalogTargets) {
    const id = target.slice(1);
    const node = nodes.find((candidate) => candidate.id === id);
    expect(node).toBeDefined();
    expect(node?.machine.getStateNodeById(id).id).toBe(id);
  }
});

test("all named implementations match the machine vocabularies", () => {
  const keys = (kind: "actions" | "guards" | "actors") =>
    [...new Set(machines.flatMap((machine) => Object.keys(machine.implementations[kind])))].sort();
  expect(keys("actions")).toEqual([...catalogActions].sort());
  expect(keys("guards")).toEqual([...catalogGuards].sort());
  expect(keys("actors")).toEqual([...catalogActors].sort());
  expect(Object.keys(sendMachine.implementations.actors)).toEqual([send.actor.REQUEST]);
});

test("shell and receiver stay flat; workflows have at most two state levels", () => {
  for (const node of nodes) {
    expect(node.path.length).toBeLessThanOrEqual(maxDepth.get(node.machine) ?? 0);
  }
});

test("all machines construct independently with disconnected dependencies", () => {
  const root = createActor(appMachine, { input: null }).start();
  const sessionActor = createActor(connectMessengerMachine, { input: null }).start();
  const navigationActor = createActor(startChatMachine, { input: null }).start();
  const conversationActor = createActor(messageSendingMachine, { input: null }).start();
  try {
    expect(root.getSnapshot().context.owner).toBeNull();
    expect(sessionActor.getSnapshot().context.owner).toBeNull();
    expect(navigationActor.getSnapshot().context.owner).toBeNull();
    expect(conversationActor.getSnapshot().context.owner).toBeNull();
  } finally {
    root.stop();
    conversationActor.stop();
    navigationActor.stop();
    sessionActor.stop();
  }
});
