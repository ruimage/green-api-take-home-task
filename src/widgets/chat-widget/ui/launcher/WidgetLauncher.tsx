import { useEffect, useRef } from "react";

import { AppContext } from "@/shared/lib/app-state/model/state-machine/app-context";
import { AppShell } from "@/shared/lib/app-state/model/state-machine/app-protocol";
import {
  selectCanOpen,
  selectCollapsed,
} from "@/shared/lib/app-state/model/state-machine/app-selectors";

import "./widget-launcher.css";

export function WidgetLauncher() {
  const collapsed = AppContext.useSelector(selectCollapsed);
  const canOpen = AppContext.useSelector(selectCanOpen);
  const actor = AppContext.useActorRef();
  const button = useRef<HTMLButtonElement>(null);
  const wasCollapsed = useRef(collapsed);

  useEffect(() => {
    if (collapsed && !wasCollapsed.current) button.current?.focus({ preventScroll: true });
    wasCollapsed.current = collapsed;
  }, [collapsed]);

  if (!collapsed) return null;

  return (
    <div className="messenger-launcher">
      <button
        ref={button}
        type="button"
        aria-label="Открыть чат"
        className="messenger-launcher__button"
        disabled={!canOpen}
        onClick={() => actor.send({ type: AppShell.event.OPEN })}
      >
        <svg
          className="messenger-launcher__plus"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M12 5v14M5 12h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <span className="messenger-launcher__label">Открыть чат</span>
      </button>
    </div>
  );
}
