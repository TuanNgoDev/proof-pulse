const assert = require("node:assert/strict");
const { test } = require("node:test");
const runtime = require("@midnight-ntwrk/compact-runtime");
const { Contract, ledger } = require("../.compact-build/contract/index.cjs");

const digest = new Uint8Array(32).fill(3);
const organizerSecret = new Uint8Array(32).fill(7);
const contract = new Contract({
  developmentEligibility: ({ privateState }) => [privateState, privateState.eligible],
  organizerSecret: ({ privateState }) => [privateState, privateState.secret],
});

function fresh(time = 150n, error = 0) {
  const initial = contract.initialState(runtime.constructorContext({ eligible: true, secret: organizerSecret }, "00".repeat(32)));
  const context = {
    originalState: initial.currentContractState,
    currentPrivateState: initial.currentPrivateState,
    currentZswapLocalState: initial.currentZswapLocalState,
    transactionContext: new runtime.QueryContext(initial.currentContractState.data, runtime.dummyContractAddress()),
  };
  context.transactionContext.block = { secondsSinceEpoch: time, secondsSinceEpochErr: error, blockHash: "00".repeat(32) };
  return context;
}

test("a caller without constructor organizer secret cannot front-run initialization", () => {
  const context = fresh();
  context.currentPrivateState = { eligible: true, secret: new Uint8Array(32).fill(8) };
  assert.throws(() => contract.circuits.createSurvey(context, digest, 100n, 200n), /Unauthorized organizer/);
  assert.equal(ledger(context.transactionContext.state).created, false);
});

test("public commitment is not an organizer credential", () => {
  const context = fresh();
  context.currentPrivateState.secret = ledger(context.transactionContext.state).organizerCommitment;
  assert.throws(() => contract.circuits.createSurvey(context, digest, 100n, 200n), /Unauthorized organizer/);
});

test("participation enforces inclusive start and exclusive end from kernel time", () => {
  for (const [time, allowed] of [[99n, false], [100n, true], [199n, true], [200n, false]]) {
    const { context } = contract.circuits.createSurvey(fresh(time), digest, 100n, 200n);
    if (allowed) assert.doesNotThrow(() => contract.circuits.checkEligibilityPrototype(context));
    else assert.throws(() => contract.circuits.checkEligibilityPrototype(context), /Survey is not open/);
  }
});

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
