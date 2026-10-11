import type { createStore } from "jotai";
import type { ActorOptions } from "xstate";

import type { appMachine } from "@/app/model/state-machine/app-machine";
import type { AppMachineInput } from "@/shared/lib/app-state/contracts/app-input";
import type { MessengerCredentialsDto } from "@/shared/service/messenger/dto";
import { OpenedWidget } from "@/widgets/chat-widget/ui/content/OpenedWidget";
import { WidgetLauncher } from "@/widgets/chat-widget/ui/launcher/WidgetLauncher";

import { AppProvider } from "./providers/AppProvider";

type AppProps = {
  inspect?: ActorOptions<typeof appMachine>["inspect"];
  input?: AppMachineInput | null;
  store?: ReturnType<typeof createStore>;
  initialCredentials?: MessengerCredentialsDto;
};

export function App({ inspect, input, store, initialCredentials }: AppProps) {
  return (
    <AppProvider
      inspect={inspect}
      input={input}
      store={store}
      initialCredentials={initialCredentials}
    >
      <OpenedWidget />
      <WidgetLauncher />
    </AppProvider>
  );
}
