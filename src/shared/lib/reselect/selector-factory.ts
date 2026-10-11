import { createSelector } from "reselect";
import { matchesState } from "xstate";
import type { StateValue } from "xstate";

export function createMachineSelectors<Snapshot extends { value: StateValue }>() {
  const create = createSelector.withTypes<Snapshot>();
  const selectStateValue = (snapshot: Snapshot) => snapshot.value;
  return {
    create,
    selectStateValue,
    state: (state: Snapshot["value"] | string) =>
      create([selectStateValue], (value) => matchesState(state, value)),
    defined: <Value>(selector: (snapshot: Snapshot) => Value) =>
      create([selector], (value) => value !== undefined),
    value: <Value>(
      selector: (snapshot: Snapshot) => Value,
      expected: NoInfer<Exclude<Value, undefined>>,
    ) => create([selector], (value) => value === expected),
  };
}
