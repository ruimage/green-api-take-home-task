import { useActorRef, useSelector } from "@xstate/react";
import { createStore, Provider as DataProvider } from "jotai";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { ActorOptions, ActorRefFrom } from "xstate";
import { matchesState } from "xstate";

import {
  clearConnectionDraft,
  connectionDraftAtom,
  ConnectMessengerContext,
} from "@/features/connect-messenger";
import type { connectMessengerMachine } from "@/features/connect-messenger";
import { session as sessionVocab } from "@/features/connect-messenger";
import { SendMessageContext } from "@/features/send-message";
import type { messageSendingMachine } from "@/features/send-message";
import { StartChatContext } from "@/features/start-chat";
import type { startChatMachine } from "@/features/start-chat";
import type { AppMachineInput } from "@/shared/lib/app-state/contracts/app-input";
import { AppContext } from "@/shared/lib/app-state/model/state-machine/app-context";
import { AppRuntimeOwner } from "@/shared/lib/app-state/runtime/app-runtime";
import type { MessengerCredentialsDto } from "@/shared/service/messenger/dto";

import { appMachine } from "../model/state-machine/app-machine";
import { app as appVocab } from "../model/state-machine/app-vocabulary";

export function AppProvider({
  input = null,
  store,
  initialCredentials,
  inspect,
  snapshot,
  children,
}: {
  input?: AppMachineInput | null;
  store?: ReturnType<typeof createStore>;
  initialCredentials?: MessengerCredentialsDto;
  inspect?: ActorOptions<typeof appMachine>["inspect"];
  snapshot?: ActorOptions<typeof appMachine>["snapshot"];
  children: ReactNode;
}) {
  const [dataStore] = useState(() => store ?? createStore());
  const [defaults] = useState(() => initialCredentials);
  const holder = useRef<{ ref: ActorRefFrom<typeof appMachine> | null }>({ ref: null });
  const [workflowInput] = useState(() => ({
    dependencies: input,
    owner: input ? new AppRuntimeOwner(input) : null,
    canConnect: () =>
      matchesState(
        appVocab.state.OPENED,
        holder.current.ref?.getSnapshot().value ?? appVocab.state.COLLAPSED,
      ),
  }));
  const app = useActorRef(appMachine, { input: workflowInput, inspect, snapshot });
  useEffect(() => {
    holder.current.ref = app;
  }, [app]);
  const session = useSelector(
    app,
    (state) =>
      (state.children[appVocab.child.SESSION] as
        | ActorRefFrom<typeof connectMessengerMachine>
        | undefined) ?? null,
  );
  const navigation = useSelector(
    app,
    (state) =>
      (state.children[appVocab.child.NAVIGATION] as
        | ActorRefFrom<typeof startChatMachine>
        | undefined) ?? null,
  );
  const conversation = useSelector(
    app,
    (state) =>
      (state.children[appVocab.child.CONVERSATION] as
        | ActorRefFrom<typeof messageSendingMachine>
        | undefined) ?? null,
  );

  useEffect(() => {
    const shellSubscription = app.subscribe((value) => {
      if (value.matches(appVocab.state.COLLAPSED)) clearConnectionDraft(dataStore);
      else if (defaults) {
        dataStore.set(connectionDraftAtom, { ...defaults });
      }
    });
    return () => {
      shellSubscription.unsubscribe();
      clearConnectionDraft(dataStore);
    };
  }, [app, dataStore, defaults]);

  useEffect(() => {
    if (!session) return;
    const sessionSubscription = session.subscribe((value) => {
      if (
        value.matches(sessionVocab.state.IDLE) ||
        (value.matches(sessionVocab.state.FAILED) &&
          !workflowInput.dependencies?.data.getCredentials())
      )
        clearConnectionDraft(dataStore);
    });
    return () => sessionSubscription.unsubscribe();
  }, [session, dataStore, workflowInput]);

  return (
    <DataProvider store={dataStore}>
      <AppContext.Provider actor={app}>
        <ConnectMessengerContext.Provider actor={session}>
          <StartChatContext.Provider actor={navigation}>
            <SendMessageContext.Provider actor={conversation}>
              {children}
            </SendMessageContext.Provider>
          </StartChatContext.Provider>
        </ConnectMessengerContext.Provider>
      </AppContext.Provider>
    </DataProvider>
  );
}
