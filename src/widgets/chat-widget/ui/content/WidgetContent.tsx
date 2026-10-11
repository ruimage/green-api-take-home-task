import { lazy, Suspense } from "react";

import { ConnectMessengerContext, selectSession } from "@/features/connect-messenger";
import { ConnectionForm } from "@/features/connect-messenger/ui";
import { StartChatContext, selectConversationSelected } from "@/features/start-chat";

const PhoneForm = lazy(() =>
  import("@/features/start-chat/ui").then(({ PhoneForm }) => ({ default: PhoneForm })),
);
const ConversationScreen = lazy(() =>
  import("../conversation/ConversationScreen").then(({ ConversationScreen }) => ({
    default: ConversationScreen,
  })),
);

export function WidgetContent() {
  const connected = ConnectMessengerContext.useSelector(selectSession);
  if (!connected) return <ConnectionForm />;
  return <WorkflowContent />;
}

function WorkflowContent() {
  const conversation = StartChatContext.useSelector(selectConversationSelected);
  return (
    <Suspense fallback={<output>{conversation ? "Загружаем чат…" : "Загружаем форму…"}</output>}>
      {conversation ? <ConversationScreen /> : <PhoneForm />}
    </Suspense>
  );
}
