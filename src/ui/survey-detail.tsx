"use client";

import Link from "next/link";
import { useSurveySession } from "@/application/survey-session";
import { surveyStatus } from "@/domain/survey/survey";
import { Arrow, Shield } from "./icons";

export function SurveyDetail({ id }: { id: string }) {
  const { surveys, now } = useSurveySession();
  const survey = surveys.find((item) => item.id === id);
  if (!survey)
    return (
      <main id="main" className="container">
        <div className="empty">
          <h1>Survey not found.</h1>
          <p className="muted">
            It may have been a local demo survey cleared by a refresh.
          </p>
          <Link href="/" className="button secondary">
            Back to surveys
          </Link>
        </div>
      </main>
    );
  const status = surveyStatus(survey, now);
  const format = (value: string) =>
    new Date(value).toLocaleString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  return (
    <main id="main" className="container">
      <Link href="/" className="back-link">
        <Arrow back />
        All surveys
      </Link>
      <div className="detail-grid">
        <div>
          <div className="page-heading">
            <h1>{survey.title}</h1>
            <span className={`status ${status.toLowerCase()}`}>{status}</span>
          </div>
          <p className="detail-description">{survey.description}</p>
          <dl className="metadata">
            <div>
              <dt>Starts · UTC</dt>
              <dd>{format(survey.startsAt)}</dd>
            </div>
            <div>
              <dt>Ends · UTC</dt>
              <dd>{format(survey.endsAt)}</dd>
            </div>
          </dl>
          <section className="stack">
            <h2>Who we’re listening to</h2>
            <p
              className="muted"
              style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {survey.eligibility}
            </p>
            {status === "Open" ? (
              <Link href={`/surveys/${id}/participate`} className="button teal">
                Take part in this survey <Arrow />
              </Link>
            ) : (
              <div className="notice">
                {status === "Scheduled"
                  ? "This survey hasn’t opened yet. Come back after the start date."
                  : "This survey has closed. Results and aggregation are not implemented in this first pass."}
              </div>
            )}
          </section>
        </div>
        <aside className="panel">
          <h2>A space for your voice.</h2>
          <ul className="privacy-list">
            <li>
              <Shield />
              <div>
                <strong>Identity: Hidden</strong>
                <span className="muted">
                  No name, email, or wallet is requested.
                </span>
              </div>
            </li>
            <li>
              <Shield />
              <div>
                <strong>Eligibility: Demo verification</strong>
                <span className="muted">
                  Choose an outcome to explore the flow. No real proof is
                  generated.
                </span>
              </div>
            </li>
            <li>
              <Shield />
              <div>
                <strong>Response: Private to your screen</strong>
                <span className="muted">
                  Response text is not sent to a server or published.
                </span>
              </div>
            </li>
          </ul>
          <div className="divider" />
          <p className="small muted">
            This is a local prototype, not a secure channel for sensitive
            information.
          </p>
          <Link
            href="/privacy"
            className="back-link"
            style={{ margin: "20px 0 0" }}
          >
            Read the privacy boundaries <Arrow />
          </Link>
        </aside>
      </div>
    </main>
  );
}
