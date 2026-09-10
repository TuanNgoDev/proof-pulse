const assert = require("node:assert/strict");
const { test } = require("node:test");
const runtime = require("@midnight-ntwrk/compact-runtime");
const { Contract, ledger } = require("../.compact-build/contract/index.cjs");

const digest = new Uint8Array(32).fill(3);
const contract = new Contract({
  developmentEligibility: ({ privateState }) => [privateState, privateState.eligible],
});

function fresh() {
  const initial = contract.initialState(runtime.constructorContext({ eligible: true }, "00".repeat(32)));
  return {
    originalState: initial.currentContractState,
    currentPrivateState: initial.currentPrivateState,
    currentZswapLocalState: initial.currentZswapLocalState,
    transactionContext: new runtime.QueryContext(initial.currentContractState.data, runtime.dummyContractAddress()),
  };
}

test("initialization persists metadata once and rejects invalid schedules", () => {
  assert.throws(() => contract.circuits.createSurvey(fresh(), digest, 200n, 100n), /Invalid survey window/);
  const { context } = contract.circuits.createSurvey(fresh(), digest, 100n, 200n);
  assert.deepEqual(ledger(context.transactionContext.state).metadataDigest, digest);
  assert.throws(() => contract.circuits.createSurvey(context, digest, 100n, 200n), /already initialized/);
});

test("anonymous response remains fail closed even with eligible witness", () => {
  const { context } = contract.circuits.createSurvey(fresh(), digest, 100n, 200n);
  assert.throws(() => contract.circuits.submitAnonymousResponsePrototype(context), /not implemented/);
});
