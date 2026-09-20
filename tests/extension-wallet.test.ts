import test from "node:test";
import assert from "node:assert/strict";
import { connectPreprodWallet, deriveWalletSecret } from "../src/lib/midnight/extension-wallet";

test("connects a v4 Lace extension only after it confirms Preprod", async () => {
  let requested = "";
  const api = { getConnectionStatus: async () => ({ status: "connected", networkId: "preprod" }) };
  const connected = await connectPreprodWallet({ mnLace: {
    apiVersion: "4.0.1",
    connect: async (network: string) => { requested = network; return api; },
  } });
  assert.equal(connected, api);
  assert.equal(requested, "preprod");
});

test("rejects missing, incompatible, disconnected and wrong-network extensions", async () => {
  await assert.rejects(connectPreprodWallet({}), /WALLET_MISSING/);
  await assert.rejects(connectPreprodWallet({ mnLace: { apiVersion: "3.0.0", connect: async () => ({ getConnectionStatus: async () => ({ status: "connected", networkId: "preprod" }) }) } }), /WALLET_MISSING/);
  await assert.rejects(connectPreprodWallet({ mnLace: { apiVersion: "4.0.1", connect: async () => ({ getConnectionStatus: async () => ({ status: "connected", networkId: "preview" }) }) } }), /WRONG_NETWORK/);
  await assert.rejects(connectPreprodWallet({ mnLace: { apiVersion: "4.0.1", connect: async () => ({ getConnectionStatus: async () => ({ status: "disconnected" }) }) } }), /DISCONNECTED/);
});

test("derives survey private state from the connected Lace identity", async () => {
  const requests: string[] = [];
  const api = {
    signData: async (data: string) => {
      requests.push(data);
      return { data, signature: "signed-proof-pulse", verifyingKey: "wallet-key" };
    },
  };
  const organizer = await deriveWalletSecret(api, "proof-pulse:organizer:v1");
  const participant = await deriveWalletSecret(api, "proof-pulse:participant:v1");
  assert.deepEqual(requests, ["proof-pulse:organizer:v1", "proof-pulse:participant:v1"]);
  assert.equal(organizer.length, 32);
  assert.notDeepEqual(organizer, participant);
});
