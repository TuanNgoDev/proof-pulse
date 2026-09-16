import type { PrivateStateProvider } from "@midnight-ntwrk/midnight-js-types";
import type { SigningKey } from "@midnight-ntwrk/compact-runtime";
import type { Witnesses } from "../../../.compact-build/contract/index.js";

export type PrivateState = {
  organizerSecret?: Uint8Array;
  participantSecret?: Uint8Array;
  responseDigest?: Uint8Array;
  responseSalt?: Uint8Array;
};

export const witnesses: Witnesses<PrivateState> = {
  organizerSecret: ({ privateState }) => {
    if (!privateState.organizerSecret) throw new Error("Missing organizerSecret");
    return [privateState, privateState.organizerSecret];
  },
  participantSecret: ({ privateState }) => {
    if (!privateState.participantSecret) throw new Error("Missing participantSecret");
    return [privateState, privateState.participantSecret];
  },
  responseDigest: ({ privateState }) => {
    if (!privateState.responseDigest) throw new Error("Missing responseDigest");
    return [privateState, privateState.responseDigest];
  },
  responseSalt: ({ privateState }) => {
    if (!privateState.responseSalt) throw new Error("Missing responseSalt");
    return [privateState, privateState.responseSalt];
  },
};

export function memoryPrivateState(): PrivateStateProvider<string, PrivateState> {
  let address = "";
  const states = new Map<string, PrivateState>();
  const keys = new Map<string, SigningKey>();
  const unsupported = async (): Promise<never> => {
    throw new Error("Private-state export is unavailable.");
  };
  return {
    setContractAddress(value) { address = value; },
    async set(id, value) { states.set(address + ":" + id, value); },
    async get(id) { return states.get(address + ":" + id) ?? null; },
    async remove(id) { states.delete(address + ":" + id); },
    async clear() { states.clear(); },
    async setSigningKey(id, value) { keys.set(id, value); },
    async getSigningKey(id) { return keys.get(id) ?? null; },
    async removeSigningKey(id) { keys.delete(id); },
    async clearSigningKeys() { keys.clear(); },
    exportPrivateStates: unsupported,
    importPrivateStates: unsupported,
    exportSigningKeys: unsupported,
    importSigningKeys: unsupported,
  };
}
