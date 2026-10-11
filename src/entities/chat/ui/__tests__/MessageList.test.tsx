import { afterEach, expect, mock, test } from "bun:test";

import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { createStore, Provider } from "jotai";

import { createChatMessage } from "../../model/chat-mappers";
import { messagesAtom } from "../../model/data-state/chat-data";
import { MessageList } from "../MessageList";
if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();
const { act, cleanup, render } = await import("@testing-library/react");
afterEach(cleanup);
test("new replies scroll into view and text is rendered literally", () => {
  const store = createStore();
  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView"),
    scroll = mock(() => {});
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: scroll });
  try {
    const view = render(
      <Provider store={store}>
        <MessageList />
      </Provider>,
    );
    expect(view.getByText("Текстовых сообщений пока нет.")).toBeTruthy();
    act(() =>
      store.set(messagesAtom, [
        createChatMessage({
          id: "1",
          chatId: "chat",
          text: "<img src=x> hello",
          direction: "incoming",
          timestamp: 1000,
        }),
      ]),
    );
    expect(view.getByText("<img src=x> hello")).toBeTruthy();
    expect(view.container.querySelector("img")).toBeNull();
    expect(scroll).toHaveBeenCalledTimes(1);
    act(() =>
      store.set(messagesAtom, (items) => [
        ...items,
        createChatMessage({
          id: "2",
          chatId: "chat",
          text: "Reply",
          direction: "incoming",
          timestamp: 2000,
        }),
      ]),
    );
    expect(view.getByText("Reply")).toBeTruthy();
    expect(scroll).toHaveBeenCalledTimes(2);
  } finally {
    cleanup();
    if (descriptor) Object.defineProperty(Element.prototype, "scrollIntoView", descriptor);
    else Reflect.deleteProperty(Element.prototype, "scrollIntoView");
  }
});
