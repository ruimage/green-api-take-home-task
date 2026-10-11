import { afterEach, expect, spyOn, test } from "bun:test";

import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { createStore } from "jotai";
import { StrictMode } from "react";

import { JotaiDevTools } from "../JotaiDevTools";
import { useFloatingDevTools } from "../use-floating-devtools";

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();
const { act, cleanup, fireEvent, render } = await import("@testing-library/react");
afterEach(cleanup);

function Fixture() {
  useFloatingDevTools();
  return (
    <section id="jotai-devtools-root">
      <section id="jotai-devtools-shell" className="jotai-devtools-shell">
        <span data-testid="shell-resize-bar" />
        <header>
          <h1>Jotai DevTools</h1>
          <button type="button">Minimize panel</button>
        </header>
      </section>
    </section>
  );
}

test("floating panel drags only by its title, stays on screen and releases listeners on unmount", () => {
  const view = render(
    <StrictMode>
      <Fixture />
    </StrictMode>,
  );
  const root = view.container.querySelector<HTMLElement>("#jotai-devtools-root")!;
  const shell = view.container.querySelector<HTMLElement>(".jotai-devtools-shell")!;
  const heading = view.getByRole("heading");
  const header = heading.parentElement!;
  const captures = new Set<number>();
  header.setPointerCapture = (id) => {
    captures.add(id);
  };
  header.hasPointerCapture = (id) => captures.has(id);
  header.releasePointerCapture = (id) => {
    captures.delete(id);
  };
  const bounds = spyOn(shell, "getBoundingClientRect").mockReturnValue(
    new DOMRect(16, 16, 680, 380),
  );
  const pointer = (target: Node | Window, type: string, clientX: number, clientY: number) => {
    fireEvent(
      target,
      new PointerEvent(type, {
        bubbles: true,
        pointerId: 1,
        isPrimary: true,
        button: 0,
        clientX,
        clientY,
      }),
    );
  };
  try {
    pointer(view.getByRole("button"), "pointerdown", 30, 30);
    pointer(document, "pointermove", 130, 130);
    expect(root.style.getPropertyValue("--floating-devtools-left")).toBe("16px");

    pointer(header, "pointerdown", 30, 30);
    pointer(document, "pointermove", 130, 130);
    expect(root.style.getPropertyValue("--floating-devtools-left")).toBe("116px");
    expect(root.style.getPropertyValue("--floating-devtools-top")).toBe("116px");
    expect(captures.has(1)).toBe(true);
    pointer(document, "pointermove", 5000, 5000);
    expect(root.style.getPropertyValue("--floating-devtools-left")).toBe(
      `${window.innerWidth - 680 - 16}px`,
    );
    expect(root.style.getPropertyValue("--floating-devtools-top")).toBe(
      `${window.innerHeight - 380 - 16}px`,
    );
    pointer(document, "pointercancel", 5000, 5000);
    expect(captures.size).toBe(0);
    expect(shell.hasAttribute("data-dragging")).toBe(false);

    bounds.mockReturnValue(new DOMRect(16, 16, window.innerWidth - 32, window.innerHeight - 32));
    fireEvent(window, new Event("resize"));
    expect(root.style.getPropertyValue("--floating-devtools-left")).toBe("16px");
    expect(root.style.getPropertyValue("--floating-devtools-top")).toBe("16px");
    pointer(heading, "pointerdown", 30, 30);
    view.unmount();
    expect(captures.size).toBe(0);
    pointer(document, "pointermove", 100, 100);
    expect(root.style.getPropertyValue("--floating-devtools-left")).toBe("");
  } finally {
    bounds.mockRestore();
  }
});

test("real Jotai DevTools header drags and resized dimensions survive minimize and reopen", async () => {
  const observed = new Map<Element, () => void>();
  const OriginalResizeObserver = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class implements ResizeObserver {
    private elements = new Set<Element>();
    constructor(private callback: ResizeObserverCallback) {}
    observe(element: Element) {
      this.elements.add(element);
      observed.set(element, () => this.callback([], this));
    }
    unobserve(element: Element) {
      this.elements.delete(element);
      observed.delete(element);
    }
    disconnect() {
      for (const element of this.elements) observed.delete(element);
      this.elements.clear();
    }
  };
  const view = render(<JotaiDevTools store={createStore()} />);
  try {
    if (!document.querySelector(".jotai-devtools-shell")) {
      fireEvent.click(view.getByTitle("Open Jotai Devtools"));
    }
    await act(async () => {
      await Bun.sleep(1);
    });
    const shell = view.container.querySelector<HTMLElement>(".jotai-devtools-shell")!;
    const root = view.container.querySelector<HTMLElement>("#jotai-devtools-root")!;
    const heading = shell.querySelector("h1")!;
    expect(heading).not.toBeNull();
    const header = heading.closest<HTMLElement>("[data-floating-devtools-header]")!;
    expect(header).not.toBeNull();
    header.setPointerCapture = () => {};
    header.hasPointerCapture = () => false;
    const bounds = spyOn(shell, "getBoundingClientRect").mockImplementation(
      () => new DOMRect(16, 16, parseFloat(shell.style.width), parseFloat(shell.style.height)),
    );
    fireEvent.pointerDown(heading, {
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: 30,
      clientY: 30,
    });
    fireEvent.pointerMove(document, { pointerId: 1, clientX: 100, clientY: 100 });
    expect(root.style.getPropertyValue("--floating-devtools-left")).toBe("86px");
    fireEvent.pointerUp(document, { pointerId: 1 });

    shell.style.width = "800px";
    shell.style.height = "500px";
    observed.get(shell)!();
    fireEvent.click(view.getByTitle("Minimize panel"));
    await act(async () => {
      await Bun.sleep(1);
    });
    fireEvent.click(view.getByTitle("Open Jotai Devtools"));
    await act(async () => {
      await Bun.sleep(1);
    });
    const reopened = view.container.querySelector<HTMLElement>(".jotai-devtools-shell")!;
    expect(reopened.style.width).toBe("800px");
    expect(reopened.style.height).toBe("500px");
    expect(reopened.querySelector("[data-floating-devtools-header]")).not.toBeNull();
    bounds.mockRestore();
  } finally {
    view.unmount();
    globalThis.ResizeObserver = OriginalResizeObserver;
  }
});
