import type { AnyStateMachine } from "xstate";

import { createActorBinding } from "@/shared/lib/xstate/actor-binding";

export const AppContext = createActorBinding<AnyStateMachine>();
export const useAppSelector = AppContext.useSelector;
