"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSurveySession } from "@/application/survey-session";
import { canRespond, validateResponse, type EligibilityResult } from "@/domain/participant/eligibility";
import { surveyStatus } from "@/domain/survey/survey";
import { verifyDevelopmentEligibility } from "@/infrastructure/development-eligibility";
import { Arrow, Shield } from "./icons";

export function ParticipantFlow({ id }: { id: string }) {
  const { surveys, now } = useSurveySession();
  const survey = surveys.find((item) => item.id === id);
  const [outcome, setOutcome] = useState<"eligible" | "ineligible">("eligible");
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  // Private response is component-local; never passed to the public survey session.
  const [response, setResponse] = useState("");
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  if (!survey) return <main id="main" className="container"><div className="empty"><h1>Survey not found.</h1><p className="muted">Refreshing clears surveys created in this local demo.</p><Link href="/" className="button secondary">All surveys</Link></div></main>;
  const status = surveyStatus(survey, now);
  async function verify() {
    setVerifying(true);
    setError("");
    try { setEligibility(await verifyDevelopmentEligibility(id, outcome)); }
    catch { setError("Demo verification failed. Please try again."); }
    finally { setVerifying(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!survey) return;
    // Recheck the wall clock at action time, even if the displayed status is a second old.
    // eslint-disable-next-line react-hooks/purity -- This form event handler runs on submit, never during render.
    const issue = validateResponse(survey, eligibility, response, Date.now());
    if (issue) { setError(issue); return; }
    setResponse("");
    setCompleted(true);
    setError("");
  }
  return <main id="main" className="container">
    <Link href={`/surveys/${id}`} className="back-link"><Arrow back />Survey details</Link>
    <div className="page-heading"><div><h1>Your voice. Just your voice.</h1><p>{survey.title}</p></div></div>
    <div className="detail-grid"><div className="stack">
      {error && <p className="error" role="alert">{error}</p>}
      {completed ? <section className="success" role="status"><h2>Thanks for trying the flow.</h2><p style={{ marginTop: 12 }}>Your response text was cleared from the form. Nothing was saved, sent, or published. This was a local submission simulation—not a collected survey response.</p><p className="small" style={{ marginTop: 12 }}>Repeat participation is not prevented. Production nullifiers and aggregation are future work.</p><Link href="/" className="button teal" style={{ marginTop: 22 }}>Back to surveys <Arrow /></Link></section> : status !== "Open" ? <div className="notice">{status === "Scheduled" ? "This survey hasn’t started yet." : "This survey is closed."} Participation is unavailable.</div> : <>
        <section className="panel"><div className="step-label">01 / ELIGIBILITY</div><h2>A little proof, no introduction.</h2><p className="small muted" style={{ marginBottom: 22 }}>{survey.eligibility}</p>
          <div className="field"><label htmlFor="outcome">Development scenario</label><select id="outcome" value={outcome} disabled={verifying} onChange={(event) => { setOutcome(event.target.value as "eligible" | "ineligible"); setEligibility(null); setResponse(""); setError(""); }}><option value="eligible">Eligible participant</option><option value="ineligible">Not eligible participant</option></select><p className="hint">You control this outcome. No identity, credential, or cryptographic proof is checked.</p></div>
          <button type="button" className="button teal" disabled={verifying} onClick={verify}>{verifying ? "Verifying demo…" : "Verify Eligibility"}<Shield /></button>
          {eligibility && <div role="status" className={eligibility.state === "eligible" ? "notice" : "error"} style={{ marginTop: 18, marginBottom: 0 }}>{eligibility.state === "eligible" ? "Eligibility: Verified (demo only). You can try the response form." : `Not eligible. ${eligibility.reason}`}</div>}
        </section>
        <section className="panel"><div className="step-label">02 / YOUR RESPONSE</div><h2>What’s on your mind?</h2><p className="small muted" style={{ marginBottom: 20 }}>{survey.description}</p>
          <form onSubmit={submit}><div className="field"><label htmlFor="response">Private response</label><textarea id="response" value={response} onChange={(event) => setResponse(event.target.value)} disabled={!canRespond(survey, eligibility, now)} required minLength={2} maxLength={2000} rows={6} placeholder="Share your perspective. Please don’t include personal or sensitive information." aria-describedby="response-note" autoComplete="off" /><p id="response-note" className="hint">{canRespond(survey, eligibility, now) ? "Local component memory only. Submitting clears this text without sending it anywhere." : "Verify demo eligibility above to unlock the response form."}</p></div><button type="submit" disabled={!canRespond(survey, eligibility, now)} className="button">Simulate private submission <Arrow /></button></form>
        </section>
      </>}
    </div><aside className="panel" style={{ alignSelf: "start" }}><h2>Here’s what stays yours.</h2><ul className="privacy-list"><li><Shield /><div><strong>Identity: Hidden</strong><span className="muted">No identity fields in this journey.</span></div></li><li><Shield /><div><strong>Eligibility: {eligibility?.state === "eligible" ? "Verified (demo)" : "Not verified"}</strong><span className="muted">A development adapter, not a real proof.</span></div></li><li><Shield /><div><strong>Response: Private</strong><span className="muted">Visible only in this form; not encrypted or durably stored.</span></div></li></ul><div className="divider" /><p className="small muted">Your browser and its extensions can read form data. Do not use this prototype for real sensitive feedback.</p></aside></div>
  </main>;
}
