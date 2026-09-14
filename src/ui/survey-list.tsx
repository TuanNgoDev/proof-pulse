"use client";

import { useState } from "react";
import Link from "next/link";
import { useSurveySession } from "@/application/survey-session";
import { surveyStatus, type SurveyStatus } from "@/domain/survey/survey";
import { Arrow, Shield } from "./icons";
import { PrivacyBand } from "./privacy-band";

export function SurveyList() {
  const { surveys, now } = useSurveySession();
  const [filter, setFilter] = useState<SurveyStatus | "All">("All");
  const shown = surveys.filter(
    (survey) => filter === "All" || surveyStatus(survey, now) === filter,
  );
  return (
    <main id="main" className="container">
      <div className="page-heading">
        <div>
          <h1>Room to be honest.</h1>
          <p>
            Meaningful feedback starts with a little privacy.
            <br />
            Find a survey, verify your eligibility, and share your perspective.
          </p>
        </div>
        <Link href="/surveys/new" className="button">
          Create survey <span aria-hidden="true">+</span>
        </Link>
      </div>
      <PrivacyBand />
      <div className="list-toolbar">
        <div className="tabs" aria-label="Filter surveys">
          {(["All", "Open", "Scheduled", "Closed"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={`tab ${filter === value ? "active" : ""}`}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === "All" ? "All surveys" : value}
            </button>
          ))}
        </div>
        <span className="small muted" aria-live="polite">
          {shown.length} {shown.length === 1 ? "survey" : "surveys"} to explore
        </span>
      </div>
      <div className="survey-grid">
        {shown.map((survey, index) => {
          const status = surveyStatus(survey, now);
          return (
            <article className="survey-card" key={survey.id}>
              <div className="card-top">
                <span className="category">
                  SURVEY / {String(index + 1).padStart(2, "0")}
                </span>
                <span className={`status ${status.toLowerCase()}`}>
                  {status}
                </span>
              </div>
              <h3>{survey.title}</h3>
              <p>{survey.description}</p>
              <div className="card-bottom">
                <span className="small muted">
                  {status === "Scheduled"
                    ? "Opens"
                    : status === "Closed"
                      ? "Ended"
                      : "Closes"}{" "}
                  {new Date(
                    status === "Scheduled" ? survey.startsAt : survey.endsAt,
                  ).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
                <Link href={`/surveys/${survey.id}`}>
                  View survey <Arrow />
                </Link>
              </div>
            </article>
          );
        })}
        {shown.length === 0 && (
          <div className="empty">
            <h2>No {filter.toLowerCase()} surveys yet.</h2>
            <p className="muted">
              Try another filter or create your first survey.
            </p>
            <Link className="button secondary" href="/surveys/new">
              Create survey
            </Link>
          </div>
        )}
      </div>
      <p className="section-note">
        <Shield />
        Survey metadata is saved to this browser’s workspace. Response text is
        never stored; only opaque commitments and a count are retained.
      </p>
    </main>
  );
}
