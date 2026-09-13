import assert from "node:assert/strict";
import { test } from "node:test";
import * as runtime from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger, pureCircuits } from "../.compact-build/contract/index.js";

const digest = new Uint8Array(32).fill(3);
const organizerSecret = new Uint8Array(32).fill(7);
const participantSecret = new Uint8Array(32).fill(11);
const secondParticipant = new Uint8Array(32).fill(12);
const responseDigest = new Uint8Array(32).fill(13);
const responseSalt = new Uint8Array(32).fill(17);
const replayGas = {
  readTime: 10n ** 18n,
  computeTime: 10n ** 18n,
  bytesWritten: 10n ** 18n,
  bytesDeleted: 10n ** 18n,
};
const contract = new Contract({
  organizerSecret: ({ privateState }) => [privateState, privateState.secret],
  participantSecret: ({ privateState }) => [privateState, privateState.participantSecret],
  responseDigest: ({ privateState }) => [privateState, privateState.responseDigest],
  responseSalt: ({ privateState }) => [privateState, privateState.responseSalt],
});

function fresh(time = 150n, error = 0, address = runtime.dummyContractAddress()) {
  const initial = contract.initialState(runtime.createConstructorContext({
    secret: organizerSecret, participantSecret, responseDigest, responseSalt,
  }, "00".repeat(32)));
  const context = {
    currentPrivateState: initial.currentPrivateState,
    currentZswapLocalState: initial.currentZswapLocalState,
    costModel: runtime.CostModel.initialCostModel(),
    currentQueryContext: new runtime.QueryContext(initial.currentContractState.data, address),
  };
  context.currentQueryContext.block = {
    ...context.currentQueryContext.block,
    secondsSinceEpoch: time,
    secondsSinceEpochErr: error,
    blockHash: "00".repeat(32),
  };
  return context;
}

function participantCommitment(context, secret = participantSecret, surveyDigest = digest) {
  return pureCircuits.participantIdentity(
    runtime.encodeContractAddress(context.currentQueryContext.address),
    surveyDigest,
    secret,
  );
}

function ready(time = 150n, error = 0, address = runtime.dummyContractAddress(), surveyDigest = digest, participants = [participantSecret]) {
  let { context } = contract.impureCircuits.createSurvey(fresh(50n, error, address), surveyDigest, 100n, 200n);
  for (const secret of participants) {
    context = contract.impureCircuits.enrollParticipant(context, participantCommitment(context, secret, surveyDigest)).context;
  }
  context.currentQueryContext.block = {
    ...context.currentQueryContext.block,
    secondsSinceEpoch: time,
    secondsSinceEpochErr: error,
  };
  return context;
}

test("organizer enrolls a nonzero participant before the start only", () => {
  let { context } = contract.impureCircuits.createSurvey(fresh(50n), digest, 100n, 200n);
  const commitment = participantCommitment(context);
  context.currentPrivateState.secret = new Uint8Array(32).fill(8);
  assert.throws(() => contract.impureCircuits.enrollParticipant(context, commitment), /organizer/i);
  context.currentPrivateState.secret = organizerSecret;
  context = contract.impureCircuits.enrollParticipant(context, commitment).context;
  assert.equal(ledger(context.currentQueryContext.state).enrolledParticipants.member(commitment), true);
  assert.throws(() => contract.impureCircuits.enrollParticipant(context, commitment), /already enrolled/i);
  assert.throws(() => contract.impureCircuits.enrollParticipant(context, new Uint8Array(32)), /missing/i);
  context.currentQueryContext.block = { ...context.currentQueryContext.block, secondsSinceEpoch: 100n };
  assert.throws(() => contract.impureCircuits.enrollParticipant(context, participantCommitment(context, secondParticipant)), /started/i);
});

test("only an enrolled participant can submit one response", () => {
  let { context } = contract.impureCircuits.createSurvey(fresh(50n), digest, 100n, 200n);
  const commitment = participantCommitment(context);
  context = contract.impureCircuits.enrollParticipant(context, commitment).context;
  context.currentQueryContext.block = { ...context.currentQueryContext.block, secondsSinceEpoch: 100n };
  context = contract.impureCircuits.submitAnonymousResponse(context).context;
  assert.equal(ledger(context.currentQueryContext.state).responseCount, 1n);
  context.currentPrivateState.responseDigest = new Uint8Array(32).fill(19);
  context.currentPrivateState.responseSalt = new Uint8Array(32).fill(23);
  assert.throws(() => contract.impureCircuits.submitAnonymousResponse(context), /already participated/i);
  context.currentPrivateState.participantSecret = secondParticipant;
  assert.throws(() => contract.impureCircuits.submitAnonymousResponse(context), /not enrolled/i);
});

test("a caller without constructor organizer secret cannot front-run initialization", () => {
  const context = fresh();
  context.currentPrivateState = { ...context.currentPrivateState, secret: new Uint8Array(32).fill(8) };
  assert.throws(() => contract.impureCircuits.createSurvey(context, digest, 100n, 200n), /Unauthorized organizer/);
  assert.equal(ledger(context.currentQueryContext.state).created, false);
});

test("public commitment is not an organizer credential", () => {
  const context = fresh();
  context.currentPrivateState.secret = ledger(context.currentQueryContext.state).organizerCommitment;
  assert.throws(() => contract.impureCircuits.createSurvey(context, digest, 100n, 200n), /Unauthorized organizer/);
});

test("participation enforces inclusive start and exclusive end from kernel time", () => {
  for (const [time, allowed] of [[99n, false], [100n, true], [199n, true], [200n, false]]) {
    const context = ready(time);
    if (allowed) assert.doesNotThrow(() => contract.impureCircuits.submitAnonymousResponse(context));
    else assert.throws(() => contract.impureCircuits.submitAnonymousResponse(context), /Survey is not open/);
  }
});

test("initialization persists metadata once and rejects invalid schedules", () => {
  assert.throws(() => contract.impureCircuits.createSurvey(fresh(), digest, 200n, 100n), /Invalid survey window/);
  const { context } = contract.impureCircuits.createSurvey(fresh(), digest, 100n, 200n);
  assert.deepEqual(ledger(context.currentQueryContext.state).metadataDigest, digest);
  assert.throws(() => contract.impureCircuits.createSurvey(context, digest, 100n, 200n), /already initialized/);
});

test("an open survey records one salted response commitment per participant secret", () => {
  const context = ready(150n, 0, runtime.dummyContractAddress(), digest, [participantSecret, new Uint8Array(32).fill(29)]);
  const submitted = contract.impureCircuits.submitAnonymousResponse(context).context;
  const state = ledger(submitted.currentQueryContext.state);
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
  assert.throws(() => contract.impureCircuits.submitAnonymousResponse(submitted), /Already participated/);
  assert.equal(ledger(submitted.currentQueryContext.state).responseCount, 1n);
  assert.deepEqual([...ledger(submitted.currentQueryContext.state).responses], [[nullifier, commitment]]);
  submitted.currentPrivateState.participantSecret = new Uint8Array(32).fill(29);
  const second = contract.impureCircuits.submitAnonymousResponse(submitted).context;
  assert.equal(ledger(second.currentQueryContext.state).responseCount, 2n);
  assert.equal(ledger(second.currentQueryContext.state).responses.size(), 2n);
});

test("response salt and digest each affect the commitment but not the nullifier", () => {
  const submit = (overrides) => {
    const context = ready();
    Object.assign(context.currentPrivateState, overrides);
    const submitted = contract.impureCircuits.submitAnonymousResponse(context).context;
    return [...ledger(submitted.currentQueryContext.state).responses][0];
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
    const context = ready(150n, 0, address, surveyDigest);
    const submitted = contract.impureCircuits.submitAnonymousResponse(context).context;
    return [...ledger(submitted.currentQueryContext.state).responses][0];
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

test("submission rejects a missing survey and an unenrolled participant", () => {
  assert.throws(() => contract.impureCircuits.submitAnonymousResponse(fresh()), /Survey must exist/);
  const { context } = contract.impureCircuits.createSurvey(fresh(), digest, 100n, 200n);
  assert.throws(() => contract.impureCircuits.submitAnonymousResponse(context), /not enrolled/i);
});

test("only organizer can close an open survey and closure cannot reopen it", () => {
  const { context } = contract.impureCircuits.createSurvey(fresh(), digest, 100n, 200n);
  context.currentPrivateState.secret = new Uint8Array(32).fill(8);
  assert.throws(() => contract.impureCircuits.closeSurvey(context), /Unauthorized organizer/);
  context.currentPrivateState.secret = organizerSecret;
  const closed = contract.impureCircuits.closeSurvey(context).context;
  assert.equal(ledger(closed.currentQueryContext.state).closed, true);
  assert.equal(ledger(closed.currentQueryContext.state).endsAt, 200n);
  assert.throws(() => contract.impureCircuits.submitAnonymousResponse(closed), /Survey is not open/);
  assert.throws(() => contract.impureCircuits.closeSurvey(closed), /Survey is not open/);
  assert.throws(() => contract.impureCircuits.createSurvey(closed, digest, 300n, 400n), /already initialized/);
});

test("submission transcript rejects duplicate, closed, expired and cross-deployment replay", () => {
  const context = ready();
  const result = contract.impureCircuits.submitAnonymousResponse(context);
  const transcript = {
    gas: replayGas,
    effects: result.context.currentQueryContext.effects,
    program: result.proofData.publicTranscript,
  };
  const replayed = context.currentQueryContext.runTranscript(transcript, runtime.CostModel.initialCostModel());
  assert.equal(ledger(replayed.state).responseCount, 1n);
  assert.deepEqual([...ledger(replayed.state).responses], [...ledger(result.context.currentQueryContext.state).responses]);
  assert.throws(() => replayed.runTranscript(transcript, runtime.CostModel.initialCostModel()));
  assert.equal(ledger(replayed.state).responseCount, 1n);

  const closed = contract.impureCircuits.closeSurvey(context).context;
  assert.throws(() => closed.currentQueryContext.runTranscript(transcript, runtime.CostModel.initialCostModel()));
  assert.equal(ledger(closed.currentQueryContext.state).responseCount, 0n);
  for (const [time, address] of [
    [200n, context.currentQueryContext.address],
    [150n, runtime.decodeContractAddress(new Uint8Array(32).fill(2))],
  ]) {
    const replay = new runtime.QueryContext(context.currentQueryContext.state, address);
    replay.block = {
      ...replay.block,
      secondsSinceEpoch: time,
      secondsSinceEpochErr: 5,
      blockHash: "00".repeat(32),
    };
    assert.throws(() => replay.runTranscript(transcript, runtime.CostModel.initialCostModel()));
    assert.equal(ledger(replay.state).responseCount, 0n);
    assert.equal(ledger(replay.state).responses.size(), 0n);
  }
});

test("response private witnesses stay out of the public ledger and transcript", () => {
  const context = ready();
  const result = contract.impureCircuits.submitAnonymousResponse(context);
  const serialize = (value) => JSON.stringify(value, (_, item) => {
    if (typeof item === "bigint") return item.toString();
    return item instanceof Uint8Array ? Buffer.from(item).toString("hex") : item;
  });
  const publicData = serialize([result.context.currentQueryContext.state.state.encode(), result.proofData.publicTranscript]);
  const privateData = serialize(result.proofData.privateTranscriptOutputs);
  for (const value of [participantSecret, responseDigest, responseSalt]) {
    const hex = Buffer.from(value).toString("hex");
    assert.ok(privateData.includes(hex), "fixture must be present in the private witness transcript");
    assert.ok(!publicData.includes(hex), "private witness must not be disclosed");
  }
});

test("scheduled and expired surveys reject closure and submission", () => {
  for (const time of [99n, 200n]) {
    const context = ready(time);
    for (const name of ["closeSurvey", "submitAnonymousResponse"]) {
      assert.throws(() => contract.impureCircuits[name](context), /Survey is not open/);
    }
  }
});

test("nonzero block uncertainty does not bypass local window checks", () => {
  for (const [time, allowed] of [[99n, false], [100n, true], [150n, true], [199n, true], [200n, false]]) {
    const context = ready(time, 5);
    if (!allowed) {
      assert.throws(() => contract.impureCircuits.submitAnonymousResponse(context), /Survey is not open/);
      continue;
    }
    const result = contract.impureCircuits.submitAnonymousResponse(context);
    const transcript = { gas: replayGas, effects: result.context.currentQueryContext.effects, program: result.proofData.publicTranscript };
    assert.doesNotThrow(() => context.currentQueryContext.runTranscript(transcript, runtime.CostModel.initialCostModel()));
    for (const replayTime of [99n, 200n]) {
      const replay = new runtime.QueryContext(context.currentQueryContext.state, runtime.dummyContractAddress());
      replay.block = {
        ...replay.block,
        secondsSinceEpoch: replayTime,
        secondsSinceEpochErr: 5,
        blockHash: "00".repeat(32),
      };
      assert.throws(() => replay.runTranscript(transcript, runtime.CostModel.initialCostModel()));
    }
  }
});
