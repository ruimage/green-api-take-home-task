import { expect, test } from "bun:test";
import { resolve } from "node:path";

import { findModelTypeViolations } from "../model-types";

test("production model contracts live in types.ts without runtime implementations", async () => {
  expect(await findModelTypeViolations(resolve(import.meta.dir, "../../../.."))).toEqual([]);
});
