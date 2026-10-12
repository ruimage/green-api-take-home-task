import { createElement } from "react";
import type { ComponentType } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { ConnectionPending, Default, RestConnection, WhatsAppConversation } from "./stories";

import "@/app/styles/index.css";

type MountParams = {
  story: string;
  props?: Record<string, unknown>;
};

declare global {
  interface Window {
    mount(params: MountParams): void;
    unmount(): void;
  }
}

const stories: Record<string, ComponentType<Record<string, unknown>>> = {
  "App/Default": Default,
  "App/WhatsAppConversation": WhatsAppConversation,
  "App/ConnectionPending": ConnectionPending,
  "App/RestConnection": RestConnection,
};
const container = document.getElementById("root");

if (!container) {
  throw new Error("Не найден контейнер для компонентных тестов");
}

let renderError: unknown;
const root = createRoot(container, {
  onUncaughtError: (error) => {
    renderError = error;
  },
});

window.mount = ({ story, props }) => {
  if (!Object.hasOwn(stories, story)) {
    throw new Error(`Неизвестный сценарий компонента: ${story}`);
  }

  renderError = undefined;
  flushSync(() => root.render(createElement(stories[story], props)));

  if (renderError) {
    throw renderError;
  }
};

window.unmount = () => {
  flushSync(() => root.render(null));
};
