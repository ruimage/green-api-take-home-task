import { Flex } from "@maxhub/max-ui";

import { MessageList } from "@/entities/chat/ui";
import { MessageComposer } from "@/features/send-message/ui";

import "./conversation-screen.css";
export function ConversationScreen() {
  return (
    <Flex asChild direction="column" align="stretch" className="conversation-screen">
      <section aria-label="Выбранный чат">
        <div className="conversation-screen__history">
          <MessageList />
        </div>
        <MessageComposer />
      </section>
    </Flex>
  );
}
