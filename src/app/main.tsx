import { StrictMode } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { readDevConnectionConfig } from "./config/dev-connection";
import { appInspectorOptions } from "./devtools/app-inspection";
import type { JotaiDevTools } from "./devtools/JotaiDevTools";
import { createRestAppRuntime } from "./model/runtime/create-rest-app-runtime";

import "./styles/index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Не найден контейнер React-приложения");
}

let inspect: ComponentProps<typeof App>["inspect"];
let DataDevTools: typeof JotaiDevTools | undefined;
let devConnection: ReturnType<typeof readDevConnectionConfig> = null;

if (process.env.NODE_ENV === "development") {
  devConnection = readDevConnectionConfig();
  const { createBrowserInspector } = await import("@statelyai/inspect");
  inspect = createBrowserInspector(appInspectorOptions).inspect;
  DataDevTools = (await import("./devtools/JotaiDevTools")).JotaiDevTools;
}

const runtime = createRestAppRuntime({ apiUrl: devConnection?.apiUrl });

createRoot(root).render(
  <StrictMode>
    {DataDevTools && <DataDevTools store={runtime.store} />}
    <App
      inspect={inspect}
      input={runtime.input}
      store={runtime.store}
      initialCredentials={devConnection?.credentials}
    />
  </StrictMode>,
);
