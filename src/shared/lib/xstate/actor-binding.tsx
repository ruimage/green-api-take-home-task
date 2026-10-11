import { useSelector } from "@xstate/react";
import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { AnyActorLogic, ActorRefFrom, SnapshotFrom } from "xstate";

export function createActorBinding<Logic extends AnyActorLogic>() {
  const Context = createContext<ActorRefFrom<Logic> | null>(null);
  function useActorRef(): ActorRefFrom<Logic> {
    const actor = useContext(Context);
    if (!actor) throw new Error("Missing widget actor provider.");
    return actor;
  }
  function useMaybeActorRef(): ActorRefFrom<Logic> | null {
    return useContext(Context);
  }
  return {
    Provider: ({ actor, children }: { actor: ActorRefFrom<Logic> | null; children: ReactNode }) => (
      <Context.Provider value={actor}>{children}</Context.Provider>
    ),
    useActorRef,
    useMaybeActorRef,
    useSelector: <Value,>(selector: (snapshot: SnapshotFrom<Logic>) => Value) =>
      useSelector(useActorRef(), (snapshot) => selector(snapshot as SnapshotFrom<Logic>)),
  };
}
