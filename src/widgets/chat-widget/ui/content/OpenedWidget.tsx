import { Component } from "react";
import type { ReactNode } from "react";

import { AppContext } from "@/shared/lib/app-state/model/state-machine/app-context";
import { AppShell } from "@/shared/lib/app-state/model/state-machine/app-protocol";
import { selectOpened } from "@/shared/lib/app-state/model/state-machine/app-selectors";

import { WidgetPanel } from "./WidgetPanel";

export function OpenedWidget() {
  const opened = AppContext.useSelector(selectOpened);
  if (!opened) return null;
  return (
    <PanelBoundary>
      <WidgetPanel />
    </PanelBoundary>
  );
}

function WidgetPanelFeedback() {
  const actor = AppContext.useActorRef();
  return (
    <div className="messenger-launcher">
      <p role="alert">Не удалось загрузить чат. Обновите страницу.</p>
      <button
        type="button"
        className="messenger-launcher__button"
        aria-label="Закрыть чат"
        onClick={() => actor.send({ type: AppShell.event.CLOSE })}
      >
        Закрыть
      </button>
    </div>
  );
}

class PanelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <WidgetPanelFeedback /> : this.props.children;
  }
}
