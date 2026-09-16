import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { encodeContractAddress } from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger, pureCircuits, type Ledger } from "../../../.compact-build/contract/index.js";
import { witnesses, type PrivateState } from "./private-state";
import type { Providers } from "./providers";

const privateStateId = "proofPulse";
export const compiledSurvey = CompiledContract.make("ProofPulse", Contract<PrivateState>).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(".compact-build"),
);

export function hex32(value: string): Uint8Array {
  if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error("Expected a 32-byte hexadecimal value.");
  return Uint8Array.from(value.match(/../g)!, (byte) => Number.parseInt(byte, 16));
}

export function participantCommitment(address: string, digest: string, secret: string): Uint8Array {
  return pureCircuits.participantIdentity(encodeContractAddress(address), hex32(digest), hex32(secret));
}

export function publicSurvey(state: Ledger) {
  return {
    created: state.created,
    closed: state.closed,
    responseCount: state.responseCount.toString(),
    enrolledParticipantCount: state.enrolledParticipants.size().toString(),
    ...(state.created ? {
      startsAt: state.startsAt.toString(), endsAt: state.endsAt.toString(),
      metadataDigest: Array.from(state.metadataDigest, (byte) => byte.toString(16).padStart(2, "0")).join(""),
    } : {}),
  };
}

type Tx = { public: { txId: string } };
type Calls = {
  createSurvey(digest: Uint8Array, start: bigint, end: bigint): Promise<Tx>;
  enrollParticipant(commitment: Uint8Array): Promise<Tx>;
  submitAnonymousResponse(): Promise<Tx>;
  closeSurvey(): Promise<Tx>;
};
export type SurveyAction = "create" | "enroll" | "respond" | "close";
type Arguments = { digest?: Uint8Array; start?: bigint; end?: bigint; commitment?: Uint8Array };

export async function runSurveyCircuit(calls: Calls, action: SurveyAction, args: Arguments = {}): Promise<string> {
  if (action === "respond") return (await calls.submitAnonymousResponse()).public.txId;
  if (action === "close") return (await calls.closeSurvey()).public.txId;
  if (action === "enroll") {
    if (args.commitment?.length !== 32) throw new Error("Missing participant commitment.");
    return (await calls.enrollParticipant(args.commitment)).public.txId;
  }
  if (args.digest?.length !== 32 || args.start === undefined || args.end === undefined || args.end <= args.start) {
    throw new Error("Invalid survey initialization.");
  }
  return (await calls.createSurvey(args.digest, args.start, args.end)).public.txId;
}

export async function readSurvey(providers: Providers, address: string) {
  hex32(address);
  const state = await providers.publicDataProvider.queryContractState(address);
  if (!state) throw new Error("Contract was not found on Preprod.");
  return publicSurvey(ledger(state.data));
}

export async function callSurvey(
  providers: Providers, address: string, privateState: PrivateState,
  action: SurveyAction, args: Arguments = {},
): Promise<string> {
  hex32(address);
  const contract = await findDeployedContract(providers, {
    compiledContract: compiledSurvey,
    contractAddress: address,
    privateStateId,
    initialPrivateState: privateState,
  });
  try {
    await providers.privateStateProvider.set(privateStateId, privateState);
    return await runSurveyCircuit(contract.callTx, action, args);
  } finally {
    await providers.privateStateProvider.remove(privateStateId);
  }
}

export async function deploySurvey(providers: Providers, organizerSecret: Uint8Array) {
  if (organizerSecret.length !== 32) throw new Error("A 32-byte organizer secret is required.");
  const deployed = await deployContract(providers, {
    compiledContract: compiledSurvey,
    privateStateId,
    initialPrivateState: { organizerSecret },
  });
  return { address: deployed.deployTxData.public.contractAddress, txId: deployed.deployTxData.public.txId };
}
