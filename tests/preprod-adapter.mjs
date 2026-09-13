import assert from "node:assert/strict";
import test from "node:test";
import { createConstructorContext } from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  artifactDirectory,
  contractName,
  privateStateId,
  publicSnapshot,
  witnesses,
} from "../contracts/preprod-adapter.mjs";

test("ProofPulse adapter builds constructor state and exposes public counters", () => {
  const privateState = {
    organizerSecret: new Uint8Array(32).fill(1),
    participantSecret: new Uint8Array(32).fill(2),
    responseDigest: new Uint8Array(32).fill(3),
    responseSalt: new Uint8Array(32).fill(4),
  };
  const initial = new Contract(witnesses).initialState(
    createConstructorContext(privateState, "0".repeat(64)),
  );
  assert.equal(contractName, "ProofPulse");
  assert.equal(privateStateId, "proofPulse");
  assert.match(artifactDirectory.replaceAll("\\", "/"), /\.compact-build\/$/);
  assert.deepEqual(publicSnapshot(initial.currentContractState.data), {
    created: false,
    closed: false,
    responseCount: 0,
    enrolledParticipantCount: 0,
    responseCommitmentCount: 0,
  });
});

test("ProofPulse witnesses fail closed when a private value is absent", () => {
  assert.throws(() => witnesses.responseSalt({ privateState: {} }), /responseSalt/);
});
