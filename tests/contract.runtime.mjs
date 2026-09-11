import assert from "node:assert/strict";
import { test } from "node:test";
import * as runtime from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger } from "../.compact-build/contract/index.cjs";

const digest = new Uint8Array(32).fill(3);
const organizerSecret = new Uint8Array(32).fill(7);
const participantSecret = new Uint8Array(32).fill(11);
const responseDigest = new Uint8Array(32).fill(13);
const responseSalt = new Uint8Array(32).fill(17);
const contract = new Contract({
  developmentEligibility: ({ privateState }) => [privateState, privateState.eligible],
  organizerSecret: ({ privateState }) => [privateState, privateState.secret],
  participantSecret: ({ privateState }) => [privateState, privateState.participantSecret],
  responseDigest: ({ privateState }) => [privateState, privateState.responseDigest],
  responseSalt: ({ privateState }) => [privateState, privateState.responseSalt],
});

function fresh(time = 150n, error = 0, address = runtime.dummyContractAddress()) {
  const initial = contract.initialState(runtime.constructorContext({
    eligible: true, secret: organizerSecret, participantSecret, responseDigest, responseSalt,
  }, "00".repeat(32)));
  const context = {
    originalState: initial.currentContractState,
    currentPrivateState: initial.currentPrivateState,
    currentZswapLocalState: initial.currentZswapLocalState,
    transactionContext: new runtime.QueryContext(initial.currentContractState.data, address),
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

test("an open survey records one salted response commitment per participant secret", () => {
  const { context } = contract.circuits.createSurvey(fresh(), digest, 100n, 200n);
  const submitted = contract.circuits.submitAnonymousResponsePrototype(context).context;
  const state = ledger(submitted.transactionContext.state);
  assert.equal(state.responseCount, 1n);
  assert.equal(state.responses.size(), 1n);
  const [[nullifier, commitment]] = [...state.responses];
  for (const value of [nullifier, commitment]) {
    assert.equal(value.length, 32);
    for (const privateValue of [participantSecret, responseDigest, responseSalt]) {
      assert.notDeepEqual(value, privateValue);
    }
  }
  submitted.currentPrivateState.responseDigest = new Uint8Array(32).fill(19);
  submitted.currentPrivateState.responseSalt = new Uint8Array(32).fill(23);
  assert.throws(() => contract.circuits.submitAnonymousResponsePrototype(submitted), /Already participated/);
  assert.equal(ledger(submitted.transactionContext.state).responseCount, 1n);
  assert.deepEqual([...ledger(submitted.transactionContext.state).responses], [[nullifier, commitment]]);
  submitted.currentPrivateState.participantSecret = new Uint8Array(32).fill(29);
  const second = contract.circuits.submitAnonymousResponsePrototype(submitted).context;
  assert.equal(ledger(second.transactionContext.state).responseCount, 2n);
  assert.equal(ledger(second.transactionContext.state).responses.size(), 2n);
});

test("response salt and digest each affect the commitment but not the nullifier", () => {
  const submit = (overrides) => {
    const { context } = contract.circuits.createSurvey(fresh(), digest, 100n, 200n);
    Object.assign(context.currentPrivateState, overrides);
    const submitted = contract.circuits.submitAnonymousResponsePrototype(context).context;
    return [...ledger(submitted.transactionContext.state).responses][0];
  };
  const [nullifier, commitment] = submit({});
  for (const overrides of [
    { responseSalt: new Uint8Array(32).fill(31) },
    { responseDigest: new Uint8Array(32).fill(37) },
  ]) {
    const [nextNullifier, nextCommitment] = submit(overrides);
    assert.deepEqual(nextNullifier, nullifier);
    assert.notDeepEqual(nextCommitment, commitment);
  }
});

test("nullifiers and commitments bind both survey metadata and deployment address", () => {
  const submit = (surveyDigest, address) => {
    const { context } = contract.circuits.createSurvey(fresh(150n, 0, address), surveyDigest, 100n, 200n);
    const submitted = contract.circuits.submitAnonymousResponsePrototype(context).context;
    return [...ledger(submitted.transactionContext.state).responses][0];
  };
  const firstAddress = runtime.decodeContractAddress(new Uint8Array(32).fill(1));
  const first = submit(digest, firstAddress);
  for (const [surveyDigest, address] of [
    [new Uint8Array(32).fill(41), firstAddress],
    [digest, runtime.decodeContractAddress(new Uint8Array(32).fill(2))],
  ]) {
    const next = submit(surveyDigest, address);
    assert.notDeepEqual(next[0], first[0]);
    assert.notDeepEqual(next[1], first[1]);
  }
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
  assert.throws(() => contract.circuits.submitAnonymousResponsePrototype(closed), /Survey is not open/);
  assert.throws(() => contract.circuits.closeSurvey(closed), /Survey is not open/);
  assert.throws(() => contract.circuits.createSurvey(closed, digest, 300n, 400n), /already initialized/);
});

test("submission transcript rejects duplicate, closed, expired and cross-deployment replay", () => {
  const { context } = contract.circuits.createSurvey(fresh(), digest, 100n, 200n);
  const result = contract.circuits.submitAnonymousResponsePrototype(context);
  const transcript = {
    gas: 1000000000n,
    effects: result.context.transactionContext.effects,
    program: result.proofData.publicTranscript,
  };
  const replayed = context.transactionContext.runTranscript(transcript, runtime.CostModel.dummyCostModel());
  assert.equal(ledger(replayed.state).responseCount, 1n);
  assert.deepEqual([...ledger(replayed.state).responses], [...ledger(result.context.transactionContext.state).responses]);
  assert.throws(() => replayed.runTranscript(transcript, runtime.CostModel.dummyCostModel()));
  assert.equal(ledger(replayed.state).responseCount, 1n);

  const closed = contract.circuits.closeSurvey(context).context;
  assert.throws(() => closed.transactionContext.runTranscript(transcript, runtime.CostModel.dummyCostModel()));
  assert.equal(ledger(closed.transactionContext.state).responseCount, 0n);
  for (const [time, address] of [
    [200n, context.transactionContext.address],
    [150n, runtime.decodeContractAddress(new Uint8Array(32).fill(2))],
  ]) {
    const replay = new runtime.QueryContext(context.transactionContext.state, address);
    replay.block = { secondsSinceEpoch: time, secondsSinceEpochErr: 5, blockHash: "00".repeat(32) };
    assert.throws(() => replay.runTranscript(transcript, runtime.CostModel.dummyCostModel()));
    assert.equal(ledger(replay.state).responseCount, 0n);
    assert.equal(ledger(replay.state).responses.size(), 0n);
  }
});

test("response private witnesses stay out of the public ledger and transcript", () => {
  const { context } = contract.circuits.createSurvey(fresh(), digest, 100n, 200n);
  const result = contract.circuits.submitAnonymousResponsePrototype(context);
  const serialize = (value) => JSON.stringify(value, (_, item) => {
    if (typeof item === "bigint") return item.toString();
    return item instanceof Uint8Array ? Buffer.from(item).toString("hex") : item;
  });
  const publicData = serialize([result.context.transactionContext.state.encode(), result.proofData.publicTranscript]);
  const privateData = serialize(result.proofData.privateTranscriptOutputs);
  for (const value of [participantSecret, responseDigest, responseSalt]) {
    const hex = Buffer.from(value).toString("hex");
    assert.ok(privateData.includes(hex), "fixture must be present in the private witness transcript");
    assert.ok(!publicData.includes(hex), "private witness must not be disclosed");
  }
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
