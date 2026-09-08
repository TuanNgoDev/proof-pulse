import assert from "node:assert/strict";
import test from "node:test";
import {
  newWorkspaceToken,
  workspaceKey,
} from "../src/infrastructure/workspace-token";

test("browser bearer tokens map to stable non-reversible database identifiers", () => {
  const token = newWorkspaceToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  const key = workspaceKey(token);
  assert.match(key, /^[a-f0-9]{64}$/);
  assert.equal(workspaceKey(token), key);
  assert.notEqual(workspaceKey(newWorkspaceToken()), key);
  assert.notEqual(token, key);
  for (const invalid of ["", "short", "!".repeat(43), "a".repeat(44)])
    assert.throws(() => workspaceKey(invalid));
});
