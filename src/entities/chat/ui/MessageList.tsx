import { useLayoutEffect, useRef } from "react";

import { useActiveChatMessages } from "../model/data-state/chat-data";
import { MessageBubble } from "./MessageBubble";

import "./message-list.css";
export function MessageList() {
  const messages = useActiveChatMessages();
  const list = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    list.current?.lastElementChild?.scrollIntoView?.({ block: "nearest" });
  }, [messages.length]);
  if (!messages.length) return <p className="message-empty">Текстовых сообщений пока нет.</p>;
  return (
    <ol ref={list} className="message-list" aria-label="История сообщений">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </ol>
  );
}
