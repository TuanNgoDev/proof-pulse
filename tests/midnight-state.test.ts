import test from "node:test";
import assert from "node:assert/strict";
import { memoryPrivateState, witnesses } from "../src/lib/midnight/private-state";

test("response witnesses fail closed and state is scoped to a contract", async () => {
  assert.throws(() => witnesses.organizerSecret({ privateState: {} } as never), /organizerSecret/);
  assert.throws(() => witnesses.responseDigest({ privateState: {} } as never), /responseDigest/);
  const store = memoryPrivateState();
  store.setContractAddress("a".repeat(64));
  await store.set("survey", { organizerSecret: new Uint8Array(32) });
  assert.equal((await store.get("survey"))?.organizerSecret?.length, 32);
  store.setContractAddress("b".repeat(64));
  assert.equal(await store.get("survey"), null);
  await store.clear();
  store.setContractAddress("a".repeat(64));
  assert.equal(await store.get("survey"), null);
});
