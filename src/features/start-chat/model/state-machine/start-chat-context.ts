import { createActorBinding } from "@/shared/lib/xstate/actor-binding";

import type { startChatMachine } from "./start-chat-machine";
export const StartChatContext = createActorBinding<typeof startChatMachine>();
export const useStartChatSelector = StartChatContext.useSelector;
