import { describe, expect, test } from "bun:test";

import { createActor } from "xstate";

import {
  selectCanClose,
  selectCanOpen,
  selectCollapsed,
  selectOpened,
} from "@/shared/lib/app-state/model/state-machine/app-selectors";
import { checkSelectors } from "@/shared/lib/xstate/testing/check-machine-selectors";

import { appMachine } from "../app-machine";
import * as workflowSelectors from "../app-selectors";
import { app } from "../app-vocabulary";

describe("root selectors", () =>
  checkSelectors(appMachine, {
    collapsed: selectCollapsed,
    opened: selectOpened,
    [`${app.state.OPENED}.${app.state.GUEST}`]: workflowSelectors.selectGuest,
    [`${app.state.OPENED}.${app.state.WORKFLOW}`]: workflowSelectors.selectWorkflow,
    [`${app.state.OPENED}.${app.state.WORKFLOW}.${app.state.CHATLESS}`]:
      workflowSelectors.selectChatless,
    [`${app.state.OPENED}.${app.state.WORKFLOW}.${app.state.CHAT}`]: workflowSelectors.selectChat,
  }));

test("OPEN/CLOSE subscriptions and shell actors remain isolated", () => {
  const first = createActor(appMachine, { input: null }).start();
  const second = createActor(appMachine, { input: null }).start();
  const changes: boolean[] = [];
  const sub = first.subscribe((snapshot) => changes.push(selectOpened(snapshot)));
  try {
    expect(selectCanOpen(first.getSnapshot())).toBe(true);
    first.send({ type: app.event.OPEN });
    expect(selectCanClose(first.getSnapshot())).toBe(true);
    expect(selectCollapsed(second.getSnapshot())).toBe(true);
    const opened = first.getSnapshot();
    first.send({ type: app.event.OPEN });
    expect(first.getSnapshot()).toBe(opened);
    first.send({ type: app.event.CLOSE });
    first.send({ type: app.event.OPEN });
    expect(changes).toEqual([true, true, false, true]);
  } finally {
    sub.unsubscribe();
    first.stop();
    second.stop();
  }
});

test("Reselect reuses state values across equivalent snapshots", () => {
  const selector = workflowSelectors.createWorkflowSelector(
    `${app.state.OPENED}.${app.state.WORKFLOW}`,
  );
  const context = createActor(appMachine, { input: null }).getSnapshot().context;
  const snapshot = appMachine.resolveState({
    context,
    value: { [app.state.OPENED]: { [app.state.WORKFLOW]: app.state.CHATLESS } },
  });
  expect(selector(snapshot)).toBe(true);
  expect(selector({ ...snapshot })).toBe(true);
  expect(selector.recomputations()).toBe(1);
});
