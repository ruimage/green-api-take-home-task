import { useEffect, useRef } from "react";

import { AppContext } from "@/shared/lib/app-state/model/state-machine/app-context";
import { AppShell } from "@/shared/lib/app-state/model/state-machine/app-protocol";
import {
  selectOpened,
  selectCanClose,
} from "@/shared/lib/app-state/model/state-machine/app-selectors";

import { ShellContent } from "../ShellContent";
import type { ShellProps } from "../types";

import "./mobile-shell.css";

let scrollLocks = 0;
let previousOverflow = "";

export function MobileShell(props: ShellProps) {
  const opened = AppContext.useSelector(selectOpened);
  const canClose = AppContext.useSelector(selectCanClose);
  const actor = AppContext.useActorRef();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!opened || !dialog) return;
    const viewport = window.visualViewport;
    const resize = () => {
      if (!viewport || viewport.scale !== 1) return;
      dialog.style.setProperty("--mobile-viewport-height", `${viewport.height}px`);
      dialog.style.setProperty("--mobile-viewport-top", `${viewport.offsetTop}px`);
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    if (scrollLocks++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    dialog.showModal();
    dialog.querySelector<HTMLElement>("input, textarea")?.focus({ preventScroll: true });
    return () => {
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      dialog.close();
      if (--scrollLocks === 0) document.body.style.overflow = previousOverflow;
    };
  }, [opened]);

  if (!opened) return null;
  return (
    <dialog
      ref={ref}
      className="mobile-shell"
      aria-label="Чат"
      onCancel={(event) => {
        event.preventDefault();
        if (canClose) actor.send({ type: AppShell.event.CLOSE });
      }}
    >
      <ShellContent {...props} />
    </dialog>
  );
}
