import { createActorBinding } from "@/shared/lib/xstate/actor-binding";

import type { messageSendingMachine } from "./message-sending-machine";
export const SendMessageContext = createActorBinding<typeof messageSendingMachine>();
export const useSendMessageSelector = SendMessageContext.useSelector;
