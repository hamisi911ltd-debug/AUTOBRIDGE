import test from "node:test";
import assert from "node:assert/strict";

import { getVisibleImageIndices } from "./carousel";

test("getVisibleImageIndices keeps only the active image plus immediate neighbors", () => {
  assert.deepEqual(getVisibleImageIndices(5, 0, 1), [0, 1, 4]);
  assert.deepEqual(getVisibleImageIndices(5, 2, 1), [1, 2, 3]);
  assert.deepEqual(getVisibleImageIndices(3, 1, 1), [0, 1, 2]);
  assert.deepEqual(getVisibleImageIndices(1, 0, 2), [0]);
});
