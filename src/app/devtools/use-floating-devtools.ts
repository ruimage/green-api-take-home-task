import { useEffect } from "react";

export function useFloatingDevTools() {
  useEffect(() => {
    const root = document.getElementById("jotai-devtools-root");
    if (!root) return;

    const margin = 16;
    const layout = { left: margin, top: margin, width: 680, height: 380 };
    let shell: HTMLElement | null = null;
    let drag: {
      pointerId: number;
      offsetX: number;
      offsetY: number;
      handle: HTMLElement;
    } | null = null;

    const move = (left: number, top: number) => {
      if (!shell) return;
      const bounds = shell.getBoundingClientRect();
      layout.left = Math.max(margin, Math.min(left, window.innerWidth - bounds.width - margin));
      layout.top = Math.max(margin, Math.min(top, window.innerHeight - bounds.height - margin));
      root.style.setProperty("--floating-devtools-left", `${layout.left}px`);
      root.style.setProperty("--floating-devtools-top", `${layout.top}px`);
    };
    const size = () => {
      if (!shell) return;
      layout.width = Math.min(layout.width, Math.max(0, window.innerWidth - margin * 2));
      layout.height = Math.min(layout.height, Math.max(0, window.innerHeight - margin * 2));
      shell.style.width = `${layout.width}px`;
      shell.style.height = `${layout.height}px`;
    };

    const finish = () => {
      if (!drag) return;
      const previous = drag;
      drag = null;
      if (previous.handle.hasPointerCapture(previous.pointerId)) {
        previous.handle.releasePointerCapture(previous.pointerId);
      }
      shell?.removeAttribute("data-dragging");
    };

    const resizeObserver = new ResizeObserver(() => {
      if (!shell) return;
      const bounds = shell.getBoundingClientRect();
      layout.width = bounds.width;
      layout.height = bounds.height;
      move(layout.left, layout.top);
    });
    const attach = () => {
      const nextShell = root.querySelector<HTMLElement>(".jotai-devtools-shell");
      if (nextShell === shell) return;
      finish();
      resizeObserver.disconnect();
      shell = nextShell;
      if (!shell) return;
      shell.children[1]?.setAttribute("data-floating-devtools-header", "");
      size();
      resizeObserver.observe(shell);
      move(layout.left, layout.top);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || !event.isPrimary || !(event.target instanceof Element)) return;
      const handle = event.target.closest<HTMLElement>("[data-floating-devtools-header]");
      if (!handle || !shell?.contains(handle)) return;
      if (event.target.closest("button, a, input, select, textarea, [role='button']")) return;
      finish();
      const bounds = shell.getBoundingClientRect();
      drag = {
        pointerId: event.pointerId,
        offsetX: event.clientX - bounds.left,
        offsetY: event.clientY - bounds.top,
        handle,
      };
      handle.setPointerCapture(event.pointerId);
      shell.setAttribute("data-dragging", "");
      event.preventDefault();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (drag?.pointerId === event.pointerId) {
        move(event.clientX - drag.offsetX, event.clientY - drag.offsetY);
      }
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (drag?.pointerId === event.pointerId) finish();
    };
    const onResize = () => {
      size();
      move(layout.left, layout.top);
    };

    const mutationObserver = new MutationObserver(attach);
    mutationObserver.observe(root, { childList: true, subtree: true });
    attach();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerEnd);
    document.addEventListener("pointercancel", onPointerEnd);
    document.addEventListener("lostpointercapture", onPointerEnd);
    window.addEventListener("resize", onResize);
    return () => {
      finish();
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerEnd);
      document.removeEventListener("pointercancel", onPointerEnd);
      document.removeEventListener("lostpointercapture", onPointerEnd);
      window.removeEventListener("resize", onResize);
      root.style.removeProperty("--floating-devtools-left");
      root.style.removeProperty("--floating-devtools-top");
    };
  }, []);
}
