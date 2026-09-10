import assert from "node:assert/strict";
import { test } from "node:test";
import * as runtime from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger } from "../.compact-build/contract/index.cjs";

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

test("participant entry points reject missing survey and false eligibility", () => {
  for (const name of ["checkEligibilityPrototype", "submitAnonymousResponsePrototype"]) {
    assert.throws(() => contract.circuits[name](fresh()), /Survey must exist/);
    const { context } = contract.circuits.createSurvey(fresh(), digest, 100n, 200n);
    context.currentPrivateState.eligible = false;
    assert.throws(() => contract.circuits[name](context), /Development eligibility rejected/);
  }
});

test("only organizer can close an open survey and closure cannot reopen it", () => {
  const { context } = contract.circuits.createSurvey(fresh(), digest, 100n, 200n);
  context.currentPrivateState.secret = new Uint8Array(32).fill(8);
  assert.throws(() => contract.circuits.closeSurvey(context), /Unauthorized organizer/);
  context.currentPrivateState.secret = organizerSecret;
  const closed = contract.circuits.closeSurvey(context).context;
  assert.equal(ledger(closed.transactionContext.state).closed, true);
  assert.equal(ledger(closed.transactionContext.state).endsAt, 200n);
  assert.throws(() => contract.circuits.checkEligibilityPrototype(closed), /Survey is not open/);
  assert.throws(() => contract.circuits.closeSurvey(closed), /Survey is not open/);
  assert.throws(() => contract.circuits.createSurvey(closed, digest, 300n, 400n), /already initialized/);
});

test("scheduled and expired surveys reject closure and both participant circuits", () => {
  for (const time of [99n, 200n]) {
    const { context } = contract.circuits.createSurvey(fresh(time), digest, 100n, 200n);
    for (const name of ["closeSurvey", "checkEligibilityPrototype", "submitAnonymousResponsePrototype"]) {
      assert.throws(() => contract.circuits[name](context), /Survey is not open/);
    }
  }
});

test("nonzero block uncertainty does not bypass local window checks", () => {
  for (const [time, allowed] of [[99n, false], [100n, true], [150n, true], [199n, true], [200n, false]]) {
    const { context } = contract.circuits.createSurvey(fresh(time, 5), digest, 100n, 200n);
    if (!allowed) {
      assert.throws(() => contract.circuits.checkEligibilityPrototype(context), /Survey is not open/);
      continue;
    }
    const result = contract.circuits.checkEligibilityPrototype(context);
    const transcript = { gas: 1000000000n, effects: result.context.transactionContext.effects, program: result.proofData.publicTranscript };
    assert.doesNotThrow(() => context.transactionContext.runTranscript(transcript, runtime.CostModel.dummyCostModel()));
    for (const replayTime of [99n, 200n]) {
      const replay = new runtime.QueryContext(context.transactionContext.state, runtime.dummyContractAddress());
      replay.block = { secondsSinceEpoch: replayTime, secondsSinceEpochErr: 5, blockHash: "00".repeat(32) };
      assert.throws(() => replay.runTranscript(transcript, runtime.CostModel.dummyCostModel()));
    }
  }
});
