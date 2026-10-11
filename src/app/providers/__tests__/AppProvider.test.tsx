import { afterEach, expect, test } from "bun:test";

import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { Typography } from "@maxhub/max-ui";
import { StrictMode, useEffect } from "react";

import { app as appVocab } from "@/app/model/state-machine/app-vocabulary";
import { ConnectMessengerContext, selectSessionState } from "@/features/connect-messenger";
import { session } from "@/features/connect-messenger";
import { SendMessageContext, selectConversationState } from "@/features/send-message";
import { StartChatContext, selectNavigationState } from "@/features/start-chat";
import { navigation } from "@/features/start-chat";
import { AppContext } from "@/shared/lib/app-state/model/state-machine/app-context";
import {
  createDataFixture,
  createSessionFixture,
  lastRequest,
  settleActors,
  TEST_MANUAL_CHAT,
  TEST_CREDENTIALS,
} from "@/shared/lib/app-state/testing/app-test-fixtures";

import type { AppActors } from "../../model/types";
import { AppProvider } from "../AppProvider";

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();
const { act, cleanup, render } = await import("@testing-library/react");
afterEach(cleanup);

function Probe({ capture }: { capture(actors: AppActors): void }) {
  const app = AppContext.useActorRef();
  const session = ConnectMessengerContext.useMaybeActorRef();
  const navigation = StartChatContext.useMaybeActorRef();
  const conversation = SendMessageContext.useMaybeActorRef();
  const shellValue = AppContext.useSelector((snapshot) =>
    typeof snapshot.value === "string" ? snapshot.value : appVocab.state.OPENED,
  );
  useEffect(
    () => capture({ app, session, navigation, conversation }),
    [capture, app, session, navigation, conversation],
  );
  return (
    <Typography.Text asChild>
      <output>
        {JSON.stringify([
          shellValue,
          session ? selectSessionState(session.getSnapshot()) : null,
          navigation ? selectNavigationState(navigation.getSnapshot()) : null,
          conversation ? selectConversationState(conversation.getSnapshot()) : null,
        ])}
      </output>
    </Typography.Text>
  );
}

test("one provider exposes the actor tree and cleans a pending request in StrictMode", async () => {
  const store = createDataFixture();
  const resources = createSessionFixture();
  const input = { sessions: resources.factory, data: store.data };
  let actors: AppActors | undefined;
  const capture = (value: AppActors) => {
    actors = value;
  };
  const tree = (
    <StrictMode>
      <AppProvider input={input}>
        <Probe capture={capture} />
      </AppProvider>
    </StrictMode>
  );
  const view = render(tree);
  if (!actors) throw new Error("Missing scoped actors.");
  expect(view.container.textContent).toBe(
    JSON.stringify([appVocab.state.COLLAPSED, null, null, null]),
  );
  await act(async () => {
    actors?.app.send({ type: appVocab.event.OPEN });
    await settleActors();
  });
  const opened = actors;
  expect(opened.session).toBeDefined();
  await act(async () => {
    opened.session?.send({ type: session.event.CONNECT, credentials: TEST_CREDENTIALS });
    await settleActors();
  });
  const activeSession = lastRequest(resources.sessions);
  await act(async () => {
    lastRequest(activeSession.control.calls.connection).resolve();
    await settleActors();
  });
  expect(actors?.session?.getSnapshot().matches(session.state.READY)).toBe(true);
  expect(view.container.textContent).toBe(
    JSON.stringify([
      appVocab.state.OPENED,
      session.state.READY,
      navigation.state.EDITING,
      session.state.IDLE,
    ]),
  );
  view.rerender(tree);
  const workflow = actors;
  expect(workflow.session).toBe(opened.session);
  await act(async () => {
    workflow.navigation?.send({
      type: navigation.event.OPEN_CHAT,
      phone: TEST_MANUAL_CHAT.displayName,
    });
    await settleActors();
  });
  const phone = lastRequest(activeSession.control.calls.phone);
  expect(workflow.navigation?.getSnapshot().matches(navigation.state.RESOLVING)).toBe(true);
  view.unmount();
  expect(phone.signal?.aborted).toBe(true);
  expect(activeSession.disposeCount).toBe(1);
  expect(store.state.credentials).toBeNull();
});
