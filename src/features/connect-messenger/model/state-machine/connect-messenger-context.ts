import { createActorBinding } from "@/shared/lib/xstate/actor-binding";

import type { connectMessengerMachine } from "./connect-messenger-machine";
export const ConnectMessengerContext = createActorBinding<typeof connectMessengerMachine>();
export const useConnectMessengerSelector = ConnectMessengerContext.useSelector;
