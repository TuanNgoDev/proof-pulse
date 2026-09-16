import test from "node:test";
import assert from "node:assert/strict";
import { createConstructorContext, encodeContractAddress } from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger, pureCircuits } from "../.compact-build/contract/index.js";
import { witnesses } from "../src/lib/midnight/private-state";
import { hex32, publicSurvey, runSurveyCircuit, participantCommitment } from "../src/lib/midnight/survey-contract";

test("projects only public survey fields and rejects malformed contract bytes", () => {
  assert.throws(() => hex32("bad"), /32-byte/);
  const initial = new Contract(witnesses).initialState(
    createConstructorContext({ organizerSecret: new Uint8Array(32).fill(1) }, "0".repeat(64)),
  );
  assert.deepEqual(publicSurvey(ledger(initial.currentContractState.data)), {
    created: false, closed: false, responseCount: "0", enrolledParticipantCount: "0",
  });
});

test("derives the same participant commitment as the Compact circuit", () => {
  const address = "01".repeat(32), metadata = "02".repeat(32), secret = "03".repeat(32);
  assert.deepEqual(participantCommitment(address, metadata, secret), pureCircuits.participantIdentity(
    encodeContractAddress(address), hex32(metadata), hex32(secret),
  ));
});

test("routes survey operations to their matching Compact circuit", async () => {
  const calls: string[] = [];
  const callTx = {
    createSurvey: async (digest: Uint8Array, start: bigint, end: bigint) => { calls.push(`create:${digest.length}:${start}:${end}`); return { public: { txId: "create-id" } }; },
    enrollParticipant: async (bytes: Uint8Array) => { calls.push(`enroll:${bytes.length}`); return { public: { txId: "enroll-id" } }; },
    submitAnonymousResponse: async () => { calls.push("respond"); return { public: { txId: "response-id" } }; },
    closeSurvey: async () => { calls.push("close"); return { public: { txId: "close-id" } }; },
  };
  assert.equal(await runSurveyCircuit(callTx, "create", { digest: new Uint8Array(32), start: BigInt(1), end: BigInt(2) }), "create-id");
  assert.equal(await runSurveyCircuit(callTx, "enroll", { commitment: new Uint8Array(32) }), "enroll-id");
  assert.equal(await runSurveyCircuit(callTx, "respond"), "response-id");
  assert.equal(await runSurveyCircuit(callTx, "close"), "close-id");
  assert.deepEqual(calls, ["create:32:1:2", "enroll:32", "respond", "close"]);
});
