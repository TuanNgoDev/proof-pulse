import { fileURLToPath } from "node:url";
import { Contract, ledger, pureCircuits } from "../.compact-build/contract/index.js";

const required = (privateState, key) => {
  const value = privateState[key];
  if (value === undefined) throw new Error(`Missing ProofPulse witness: ${key}`);
  return [privateState, value];
};

export const contractName = "ProofPulse";
export const privateStateId = "proofPulse";
export const artifactDirectory = fileURLToPath(new URL("../.compact-build/", import.meta.url));
export const witnesses = {
  organizerSecret: ({ privateState }) => required(privateState, "organizerSecret"),
  participantSecret: ({ privateState }) => required(privateState, "participantSecret"),
  responseDigest: ({ privateState }) => required(privateState, "responseDigest"),
  responseSalt: ({ privateState }) => required(privateState, "responseSalt"),
};

export function publicSnapshot(data) {
  const state = ledger(data);
  const snapshot = {
    created: state.created,
    closed: state.closed,
    responseCount: Number(state.responseCount),
    enrolledParticipantCount: Number(state.enrolledParticipants.size()),
    responseCommitmentCount: Number(state.responses.size()),
  };
  if (state.created) {
    snapshot.metadataDigest = Buffer.from(state.metadataDigest).toString("hex");
    snapshot.startsAt = Number(state.startsAt);
    snapshot.endsAt = Number(state.endsAt);
  }
  return snapshot;
}

export { Contract, ledger, pureCircuits };
