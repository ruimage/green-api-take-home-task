import { expect, test } from "bun:test";

import { createActor } from "xstate";
import type { AnyMachineSnapshot, AnyStateMachine, StateValue } from "xstate";

function fromPath(path: string[]): StateValue {
  return path.length === 1 ? path[0]! : { [path[0]!]: fromPath(path.slice(1)) };
}

export function checkSelectors(
  machine: AnyStateMachine,
  selectors: Record<string, (snapshot: AnyMachineSnapshot) => boolean>,
) {
  const context = createActor(machine, { input: null }).getSnapshot().context;
  const nodes: (typeof machine.root)[] = [];
  function visit(node: typeof machine.root) {
    Object.values(node.states).forEach((child) => {
      nodes.push(child);
      visit(child);
    });
  }
  visit(machine.root);
  test("boolean selectors cover every local state node", () => {
    expect(Object.keys(selectors).sort()).toEqual(nodes.map((node) => node.path.join(".")).sort());
  });
  for (const leaf of nodes.filter((node) => !Object.keys(node.states).length)) {
    test(`selectors match local leaf ${leaf.path.join(".")}`, () => {
      const snapshot = machine.resolveState({ context, value: fromPath(leaf.path) });
      for (const [path, selector] of Object.entries(selectors)) {
        expect(selector(snapshot)).toBe(
          leaf.path.join(".") === path || leaf.path.join(".").startsWith(`${path}.`),
        );
      }
    });
  }
}
