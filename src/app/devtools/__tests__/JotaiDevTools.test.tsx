import { afterEach, expect, test } from "bun:test";

import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { atom, createStore } from "jotai";

import { JotaiDevTools } from "../JotaiDevTools";

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();
const { act, cleanup, fireEvent, render, within } = await import("@testing-library/react");
afterEach(cleanup);

async function settle(run: () => void = () => {}) {
  await act(async () => {
    run();
    await Bun.sleep(1);
  });
}

test("Jotai history records from mount while minimized, can pause, and starts again after remount", async () => {
  const counter = atom(0);
  counter.debugLabel = "recording-test";
  const store = createStore();
  const unsubscribe = store.sub(counter, () => {});
  const oldPauseKey = "jotai-devtools-should-record-snapshot-history-V0";
  localStorage.setItem(oldPauseKey, "false");
  localStorage.setItem("jotai-devtools-is-shell-open-V0", "false");
  let view = render(<JotaiDevTools store={store} />);
  try {
    await settle();
    expect(view.queryByTestId("jotai-devtools-shell")).toBeNull();
    await settle(() => store.set(counter, 1));
    await settle(() => store.set(counter, 2));
    await settle(() => fireEvent.click(view.getByTitle("Open Jotai Devtools")));
    await settle(() => fireEvent.click(view.getByRole("tab", { name: "Time travel" })));
    expect(view.getByRole("button", { name: "Stop recording snapshot history" })).toBeTruthy();
    const snapshots = () =>
      within(view.getByTestId("jotai-devtools-snapshot-history-list")).getAllByRole("button");
    expect(snapshots().length).toBeGreaterThanOrEqual(2);
    await settle(() =>
      fireEvent.click(view.getByRole("button", { name: "Stop recording snapshot history" })),
    );
    const pausedCount = snapshots().length;
    await settle(() => store.set(counter, 3));
    expect(snapshots()).toHaveLength(pausedCount);
    view.unmount();
    view = render(<JotaiDevTools store={store} />);
    await settle();
    if (view.queryByTitle("Open Jotai Devtools")) {
      await settle(() => fireEvent.click(view.getByTitle("Open Jotai Devtools")));
    }
    await settle(() => fireEvent.click(view.getByRole("tab", { name: "Time travel" })));
    expect(view.getByRole("button", { name: "Stop recording snapshot history" })).toBeTruthy();
    await settle(() => store.set(counter, 4));
    expect(snapshots().length).toBeGreaterThan(0);
  } finally {
    view.unmount();
    unsubscribe();
    localStorage.removeItem(oldPauseKey);
  }
});
