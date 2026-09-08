"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSurveySession } from "@/application/survey-session";
import { Arrow } from "./icons";

export function CreateSurveyForm() {
  const router = useRouter();
  const { addSurvey } = useSurveySession();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "");
    setError("");
    setSaving(true);
    try {
      const survey = await addSurvey({
        title: text("title"),
        description: text("description"),
        eligibility: text("eligibility"),
        startsAt: text("startsAt"),
        endsAt: text("endsAt"),
      });
      router.push(`/surveys/${survey.id}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Survey could not be created. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <main id="main" className="container">
      <Link href="/" className="back-link">
        <Arrow back />
        All surveys
      </Link>
      <div className="page-heading">
        <div>
          <h1>Start a conversation.</h1>
          <p>Give your community a safe space to share what matters.</p>
        </div>
      </div>
      <div className="detail-grid">
        <form className="form" onSubmit={submit}>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <div className="field">
            <label htmlFor="title">Survey title</label>
            <input
              id="title"
              name="title"
              required
              minLength={3}
              maxLength={100}
              placeholder="What would you like to hear about?"
            />
          </div>
          <div className="field">
            <label htmlFor="description">Description / response prompt</label>
            <textarea
              id="description"
              name="description"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              placeholder="Explain the topic and what feedback would be helpful."
            />
            <p className="hint">
              Participants will answer this prompt in a single private text
              response.
            </p>
          </div>
          <div className="field">
            <label htmlFor="eligibility">Who can participate?</label>
            <textarea
              id="eligibility"
              name="eligibility"
              required
              minLength={5}
              maxLength={500}
              rows={3}
              placeholder="For example, current members of your organization."
            />
            <p className="hint">
              This describes a future proof requirement. The demo does not
              enforce real membership.
            </p>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="startsAt">Starts at</label>
              <input
                id="startsAt"
                name="startsAt"
                type="datetime-local"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="endsAt">Ends at</label>
              <input id="endsAt" name="endsAt" type="datetime-local" required />
            </div>
          </div>
          <p className="hint" style={{ marginBottom: 24 }}>
            Enter dates in your device’s local timezone. Details are displayed
            in UTC. End must be after start.
          </p>
          <button className="button" type="submit" disabled={saving}>
            {saving ? "Saving survey…" : "Create demo survey"} <Arrow />
          </button>
        </form>
        <aside>
          <div className="panel stack">
            <h2>A thoughtful beginning.</h2>
            <p className="muted small">
              Ask one clear question. Explain who you want to hear from. Give
              people enough time to respond.
            </p>
            <div className="divider" />
            <p className="small">
              Public: title, description, eligibility and dates.
            </p>
            <p className="small muted">
              No participant identities or individual responses appear in the
              survey directory.
            </p>
            <div className="notice">
              Survey metadata is saved to your browser’s server-side workspace.
              Keep its cookie to return later. Other browsers cannot open your
              surveys.
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
