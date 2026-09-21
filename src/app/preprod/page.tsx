"use client";

import { useState } from "react";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import deployments from "../../../deployments/preprod.json";
import { connectPreprodWallet, deriveWalletSecret } from "@/lib/midnight/extension-wallet";
import type { Providers } from "@/lib/midnight/providers";

type Snapshot = {
  created: boolean;
  closed: boolean;
  responseCount: string;
  enrolledParticipantCount: string;
  startsAt?: string;
  endsAt?: string;
  metadataDigest?: string;
};

const walletMethods = [
  "getUnshieldedAddress",
  "getShieldedAddresses",
  "getConfiguration",
  "getProvingProvider",
  "balanceUnsealedTransaction",
  "submitTransaction",
  "signData",
] as const;

function bytesHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value.trim())));
}

export default function PreprodPage() {
  const [api, setApi] = useState<ConnectedAPI | null>(null);
  const [providers, setProviders] = useState<Providers | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [address, setAddress] = useState(deployments.contracts[0].contractAddress);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [question, setQuestion] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [response, setResponse] = useState("");
  const [txId, setTxId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    setError("");
    try {
      const injected = Reflect.get(window, "midnight") as Record<string, InitialAPI> | undefined;
      const connected = await connectPreprodWallet(injected);
      await connected.hintUsage([...walletMethods]);
      const [{ walletProviders }, unshielded] = await Promise.all([
        import("@/lib/midnight/providers"),
        connected.getUnshieldedAddress(),
      ]);
      const nextProviders = await walletProviders(connected, window.location.origin);
      setApi(connected);
      setProviders(nextProviders);
      setWalletAddress(unshielded.unshieldedAddress);
      const { readSurvey } = await import("@/lib/midnight/survey-contract");
      setSnapshot(await readSurvey(nextProviders, address));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lace connection failed.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh(current = address) {
    if (!providers) throw new Error("Connect Lace first.");
    const { readSurvey } = await import("@/lib/midnight/survey-contract");
    setSnapshot(await readSurvey(providers, current));
  }

  async function launchSurvey() {
    if (!providers || !api || busy) return;
    if (!question.trim() || !start || !end) {
      setError("Add a survey question and response window.");
      return;
    }
    setBusy(true);
    setError("");
    setTxId("");
    try {
      const startsAt = BigInt(Math.floor(new Date(start).getTime() / 1000));
      const endsAt = BigInt(Math.floor(new Date(end).getTime() / 1000));
      if (endsAt <= startsAt) throw new Error("The survey end must be after its start.");
      const organizerSecret = await deriveWalletSecret(api, "proof-pulse:organizer:v1");
      const { deploySurvey, callSurvey } = await import("@/lib/midnight/survey-contract");
      const deployed = await deploySurvey(providers, organizerSecret);
      const id = await callSurvey(providers, deployed.address, { organizerSecret }, "create", {
        digest: await digest(question),
        start: startsAt,
        end: endsAt,
      });
      setAddress(deployed.address);
      setTxId(id);
      await refresh(deployed.address);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Survey launch failed.");
    } finally {
      setBusy(false);
    }
  }

  async function enrollWallet() {
    if (!providers || !api || busy) return;
    setBusy(true);
    setError("");
    setTxId("");
    try {
      const { callSurvey, participantCommitment, readSurvey } = await import("@/lib/midnight/survey-contract");
      const current = snapshot ?? await readSurvey(providers, address);
      if (!current.metadataDigest) throw new Error("This survey has not been created yet.");
      const participantSecret = await deriveWalletSecret(api, "proof-pulse:participant:v1");
      const organizerSecret = await deriveWalletSecret(api, "proof-pulse:organizer:v1");
      const commitment = participantCommitment(address, current.metadataDigest, bytesHex(participantSecret));
      setTxId(await callSurvey(providers, address, { organizerSecret }, "enroll", { commitment }));
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enrollment failed.");
    } finally {
      setBusy(false);
    }
  }

  async function submitResponse() {
    if (!providers || !api || busy) return;
    if (!response.trim()) {
      setError("Write a response before submitting.");
      return;
    }
    setBusy(true);
    setError("");
    setTxId("");
    try {
      const { callSurvey } = await import("@/lib/midnight/survey-contract");
      const id = await callSurvey(providers, address, {
        participantSecret: await deriveWalletSecret(api, "proof-pulse:participant:v1"),
        responseSalt: crypto.getRandomValues(new Uint8Array(32)),
        responseDigest: await digest(response),
      }, "respond");
      setTxId(id);
      setResponse("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Response submission failed.");
    } finally {
      setBusy(false);
    }
  }

  async function closeSurvey() {
    if (!providers || !api || busy) return;
    setBusy(true);
    setError("");
    setTxId("");
    try {
      const { callSurvey } = await import("@/lib/midnight/survey-contract");
      const organizerSecret = await deriveWalletSecret(api, "proof-pulse:organizer:v1");
      setTxId(await callSurvey(providers, address, { organizerSecret }, "close"));
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Survey close failed.");
    } finally {
      setBusy(false);
    }
  }

  return <main id="main" className="preprod-console pulse-console">
    <header className="pulse-hero">
      <p className="pulse-kicker">ProofPulse · Preprod</p>
      <h1>Private feedback, signed by Lace</h1>
      <p>The wallet supplies identity, proof generation, fees, and transaction submission. No participant or organizer secret is requested.</p>
    </header>

    <ol className="pulse-flow">
      <li className="panel">
        <p><strong>01 · Connect wallet</strong></p>
        <button type="button" disabled={busy} onClick={() => { void connect(); }}>
          {busy ? "Connecting…" : api ? "Reconnect Lace" : "Connect Lace"}
        </button>
        {walletAddress ? <p>{walletAddress}</p> : null}
      </li>

      {api ? <>
        <li className="panel">
          <p><strong>02 · Inspect survey</strong></p>
          <label>Contract address<input value={address} maxLength={64} onChange={(event) => { setAddress(event.target.value.trim()); setSnapshot(null); }} /></label>
          <button type="button" disabled={busy} onClick={() => { void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Cannot read survey.")); }}>Refresh on-chain state</button>
          {snapshot ? <p role="status">{snapshot.closed ? "Closed" : snapshot.created ? "Open" : "Not configured"} · {snapshot.enrolledParticipantCount} enrolled · {snapshot.responseCount} responses</p> : null}
        </li>

        <li className="panel">
          <p><strong>03 · Launch a survey</strong></p>
          <label>Survey question<textarea rows={3} maxLength={500} value={question} onChange={(event) => setQuestion(event.target.value)} /></label>
          <div className="pulse-date-grid">
            <label>Starts<input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} /></label>
            <label>Ends<input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
          </div>
          <button type="button" disabled={busy} onClick={() => { void launchSurvey(); }}>Launch with Lace</button>
        </li>

        <li className="panel">
          <p><strong>04 · Participate</strong></p>
          <button type="button" disabled={busy} onClick={() => { void enrollWallet(); }}>Enroll this wallet</button>
          <label>Anonymous response<textarea rows={5} maxLength={4000} value={response} onChange={(event) => setResponse(event.target.value)} /></label>
          <div className="pulse-action-row">
            <button type="button" disabled={busy} onClick={() => { void submitResponse(); }}>Submit private response</button>
            <button type="button" disabled={busy} onClick={() => { void closeSurvey(); }}>Close survey</button>
          </div>
        </li>
      </> : null}
    </ol>

    {busy ? <p role="status">Waiting for Lace and Preprod confirmation…</p> : null}
    {txId ? <p role="status">Confirmed: <a href={"https://explorer.preprod.midnight.network/transactions/" + txId} target="_blank" rel="noreferrer">{txId}</a></p> : null}
    {error ? <p role="alert">{error}</p> : null}
  </main>;
}
