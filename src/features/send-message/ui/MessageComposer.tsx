import { useRef } from "react";

import { useMessageDraft } from "../model/data-state/message-draft";
import { conversation } from "../model/state-machine/conversation-vocabulary";
import { SendMessageContext } from "../model/state-machine/send-message-context";
import { selectConversation } from "../model/state-machine/send-message-selectors";
export function MessageComposer() {
  const [draft, setDraft] = useMessageDraft();
  const ready = SendMessageContext.useSelector(selectConversation);
  const actor = SendMessageContext.useActorRef();
  const composing = useRef(false);
  const submit = () => actor.send({ type: conversation.event.SEND_MESSAGE });
  return (
    <form
      className="message-composer"
      aria-label="Отправка сообщения"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <textarea
        aria-label="Текст сообщения"
        placeholder="Напишите сообщение"
        value={draft}
        rows={1}
        disabled={!ready}
        onChange={(event) => setDraft(event.target.value)}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
        onKeyDown={(event) => {
          if (
            event.key !== "Enter" ||
            event.shiftKey ||
            event.nativeEvent.isComposing ||
            composing.current ||
            event.keyCode === 229
          )
            return;
          event.preventDefault();
          if (!event.repeat) submit();
        }}
      />
      <button type="submit" aria-label="Отправить" disabled={!ready || !draft.trim()}>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M12 19V5m-7 7 7-7 7 7" />
        </svg>
      </button>
    </form>
  );
}

import "./message-composer.css";
