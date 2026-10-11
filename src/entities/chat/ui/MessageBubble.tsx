import { MessageDirection, MessageStatus } from "../model/message-constants";
import type { ChatMessage } from "../model/types";
const messageDateFormat = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });
export function MessageBubble({ message }: { message: ChatMessage }) {
  const outgoing = message.direction === MessageDirection.OUTGOING;
  const date = new Date(message.timestamp);
  const validDate = !Number.isNaN(date.getTime());
  return (
    <li className={outgoing ? "message-row--outgoing" : undefined}>
      <div className="message-bubble">
        <p className="message-bubble__text">{message.text}</p>
        <div className="message-bubble__meta">
          {validDate ? (
            <time dateTime={date.toISOString()}>{messageDateFormat.format(date)}</time>
          ) : (
            <span>Время недоступно</span>
          )}
          {outgoing && message.status && (
            <span>
              {message.status === MessageStatus.SENDING
                ? "Отправляется…"
                : message.status === MessageStatus.SENT
                  ? "Отправлено"
                  : "Не отправлено"}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
