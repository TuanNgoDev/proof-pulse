"use client";

import { useState } from "react";
import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import deployments from "../../../deployments/preprod.json";
import { connectPreprodWallet } from "@/lib/midnight/extension-wallet";
import type { Providers } from "@/lib/midnight/providers";
import type { SurveyAction } from "@/lib/midnight/survey-contract";

type Snapshot = { created: boolean; closed: boolean; responseCount: string; enrolledParticipantCount: string; startsAt?: string; endsAt?: string; metadataDigest?: string };

export default function PreprodPage() {
  const [api, setApi] = useState<ConnectedAPI | null>(null);
  const [providers, setProviders] = useState<Providers | null>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [address, setAddress] = useState(deployments.contracts[0].contractAddress);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [organizer, setOrganizer] = useState("");
  const [participant, setParticipant] = useState("");
  const [metadataDigest, setMetadataDigest] = useState("");
  const [participantCommitment, setParticipantCommitment] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [response, setResponse] = useState("");
  const [salt, setSalt] = useState("");
  const [txId, setTxId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true); setError("");
    try {
      const injected = Reflect.get(window, "midnight") as Record<string, InitialAPI> | undefined;
      const connected = await connectPreprodWallet(injected);
      const [{ walletProviders }, unshielded] = await Promise.all([
        import("@/lib/midnight/providers"), connected.getUnshieldedAddress(),
      ]);
      setProviders(await walletProviders(connected, window.location.origin));
      setApi(connected); setWalletAddress(unshielded.unshieldedAddress);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Wallet connection failed."); }
    finally { setBusy(false); }
  }

  async function refresh(current = address) {
    if (!providers) throw new Error("Connect Lace first.");
    const { readSurvey } = await import("@/lib/midnight/survey-contract");
    setSnapshot(await readSurvey(providers, current));
  }

  async function read() {
    setBusy(true); setError("");
    try { await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Cannot read contract."); }
    finally { setBusy(false); }
  }

  async function deriveCommitment() {
    setError("");
    try {
      if (!snapshot?.metadataDigest) throw new Error("Read a created survey first.");
      const { participantCommitment } = await import("@/lib/midnight/survey-contract");
      setParticipantCommitment(Array.from(participantCommitment(address, snapshot.metadataDigest, participant), (byte) => byte.toString(16).padStart(2, "0")).join(""));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not derive participant commitment."); }
  }

  async function deploy() {
    if (!providers || !api || busy || !window.confirm("Deploy a NEW Preprod survey contract? Save the organizer secret privately first; Lace will request approval.")) return;
    setBusy(true); setError(""); setTxId("");
    try {
      const { deploySurvey, hex32 } = await import("@/lib/midnight/survey-contract");
      const result = await deploySurvey(providers, hex32(organizer));
      setAddress(result.address); setTxId(result.txId); setOrganizer("");
      try { await refresh(result.address); } catch { setError("Transaction submitted; refresh the survey separately before retrying."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Deployment failed. Check the explorer before retrying."); }
    finally { setBusy(false); }
  }

  async function transact(action: SurveyAction) {
    if (!providers || !api || busy || !window.confirm(`Submit ${action} to Midnight Preprod? Lace will request approval.`)) return;
    setBusy(true); setError(""); setTxId("");
    try {
      const { callSurvey, hex32 } = await import("@/lib/midnight/survey-contract");
      const privateState = action === "respond"
        ? { participantSecret: hex32(participant), responseSalt: hex32(salt), responseDigest: new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(response.trim()))) }
        : { organizerSecret: hex32(organizer) };
      if (action === "respond" && !response.trim()) throw new Error("Enter a response before submitting.");
      const args = action === "create"
        ? { digest: hex32(metadataDigest), start: BigInt(start), end: BigInt(end) }
        : action === "enroll" ? { commitment: hex32(participantCommitment) } : {};
      const id = await callSurvey(providers, address, privateState, action, args);
      setTxId(id); setOrganizer(""); setParticipant(""); setSalt(""); setResponse("");
      try { await refresh(); } catch { setError("Transaction submitted; refresh the survey separately before retrying."); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Transaction failed. Check the explorer before retrying."); }
    finally { setBusy(false); }
  }

  return <main id="main" className="preprod-console" style={{ maxWidth: 900, margin: "40px auto", padding: "0 24px", display: "grid", gap: 20 }}>
    <header><h1>Midnight Preprod</h1><p>Wallet-signed survey contract actions. This console is separate from the browser-workspace survey database; sample contracts may have expired.</p></header>
    <section className="panel"><h2>Connect and inspect</h2><button type="button" disabled={busy} onClick={() => { void connect(); }}>{api ? "Reconnect Lace" : "Connect Lace extension"}</button>{walletAddress && <p>Connected: <code>{walletAddress}</code></p>}
      <label>Contract address <input value={address} maxLength={64} onChange={(event) => { setAddress(event.target.value.trim()); setSnapshot(null); }} /></label>
      <button type="button" disabled={busy || !providers} onClick={() => { void read(); }}>Read confirmed public state</button>
      {snapshot && <p role="status">Created: {String(snapshot.created)} · Closed: {String(snapshot.closed)} · Responses: {snapshot.responseCount} · Enrolled: {snapshot.enrolledParticipantCount}{snapshot.startsAt && <> · Window: {snapshot.startsAt}–{snapshot.endsAt}</>}</p>}
    </section>
    <section className="panel"><h2>Organizer</h2><fieldset disabled={busy || !providers} style={{ display: "grid", gap: 12 }}>
      <label>Organizer secret (32-byte hex) <input type="password" value={organizer} maxLength={64} autoComplete="off" onChange={(event) => setOrganizer(event.target.value.trim())} /></label>
      <button type="button" onClick={() => { void deploy(); }}>Deploy new survey contract</button>
      <label>Survey metadata digest (32-byte hex) <input value={metadataDigest} maxLength={64} onChange={(event) => setMetadataDigest(event.target.value.trim())} /></label>
      <label>Start (Unix seconds) <input inputMode="numeric" value={start} onChange={(event) => setStart(event.target.value)} /></label>
      <label>End (Unix seconds) <input inputMode="numeric" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
      <button type="button" onClick={() => { void transact("create"); }}>Create survey on-chain</button>
      <label>Participant commitment (32-byte hex) <input value={participantCommitment} maxLength={64} onChange={(event) => setParticipantCommitment(event.target.value.trim())} /></label>
      <div><button type="button" onClick={() => { void transact("enroll"); }}>Enroll participant</button> <button type="button" onClick={() => { void transact("close"); }}>Close survey</button></div>
    </fieldset></section>
    <section className="panel"><h2>Participant</h2><fieldset disabled={busy || !providers} style={{ display: "grid", gap: 12 }}>
      <label>Participant secret (32-byte hex) <input type="password" value={participant} maxLength={64} autoComplete="off" onChange={(event) => setParticipant(event.target.value.trim())} /></label>
      <button type="button" onClick={() => { void deriveCommitment(); }}>Derive participant commitment for organizer enrollment</button>
      <label>Private salt (32-byte hex) <input type="password" value={salt} maxLength={64} autoComplete="off" onChange={(event) => setSalt(event.target.value.trim())} /></label>
      <label>Response text (hashed locally) <textarea value={response} maxLength={4000} onChange={(event) => setResponse(event.target.value)} /></label>
      <button type="button" onClick={() => { void transact("respond"); }}>Submit anonymous response on-chain</button>
    </fieldset></section>
    {busy && <p role="status">Waiting for Lace and Preprod confirmation…</p>}
    {txId && <p role="status">Confirmed transaction: <a href={`https://explorer.preprod.midnight.network/transactions/${txId}`} target="_blank" rel="noreferrer">{txId}</a></p>}
    {error && <p role="alert">{error}</p>}
  </main>;
}
