"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  createSurvey,
  type Survey,
  type SurveyInput,
} from "@/domain/survey/survey";
import { createSurveyAction, loadSurveysAction, surveyLifecycleAction } from "./survey-actions";
import { submitResponseAction } from "./survey-actions";
import type { PublicResponseEnvelope } from "@/domain/privacy/protocol";
import { usePathname } from "next/navigation";

const SurveyContext = createContext<{
  surveys: Survey[];
  now: number;
  addSurvey: (input: SurveyInput) => Promise<Survey>;
  changeSurvey: (id: string, operation: "edit" | "close" | "check", input?: SurveyInput) => Promise<Survey>;
  recordResponse: (envelope: PublicResponseEnvelope) => Promise<{
    id: string;
    surveyId: string;
    commitment: string;
    nullifier: string;
    submittedAt: string;
  }>;
} | null>(null);

export function SurveySession({
  children,
  initialNow,
}: {
  children: React.ReactNode;
  initialNow: number;
}) {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const pathname = usePathname();
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    if (loaded || pathname === "/privacy") return;
    let active = true;
    loadSurveysAction()
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setSurveys(result.data);
          setLoaded(true);
        } else setLoadError(result.error);
      })
      .catch(() => {
        if (active)
          setLoadError(
            "Could not connect to your survey workspace. Please retry.",
          );
      });
    return () => {
      active = false;
    };
  }, [loaded, pathname]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function addSurvey(input: SurveyInput) {
    // Normalize device-local datetime values before crossing the server boundary.
    const normalized = createSurvey(input, "validation-only");
    const result = await createSurveyAction({
      title: normalized.title,
      description: normalized.description,
      eligibility: normalized.eligibility,
      startsAt: normalized.startsAt,
      endsAt: normalized.endsAt,
    });
    if (!result.ok) throw new Error(result.error);
    const survey = result.data;
    setSurveys((current) => [survey, ...current]);
    return survey;
  }
  async function changeSurvey(id: string, operation: "edit" | "close" | "check", input?: SurveyInput) {
    let fields;
    if (input) {
      const normalized = createSurvey(input, id);
      fields = {
        title: normalized.title, description: normalized.description,
        eligibility: normalized.eligibility, startsAt: normalized.startsAt, endsAt: normalized.endsAt,
      };
    }
    const result = await surveyLifecycleAction(id, operation, fields);
    if (!result.ok) {
      // Refresh stale tabs after lifecycle rejection, but never mask the original failure.
      try {
        const latest = await loadSurveysAction();
        if (latest.ok) setSurveys(latest.data);
      } catch { /* The action error below keeps the flow closed on connection failure. */ }
      throw new Error(result.error);
    }
    setSurveys((current) => current.map((survey) => survey.id === id ? result.data : survey));
    return result.data;
  }
  async function recordResponse(envelope: PublicResponseEnvelope) {
    const result = await submitResponseAction(envelope);
    if (!result.ok) throw new Error(result.error);
    setSurveys((current) =>
      current.map((survey) =>
        survey.id === envelope.surveyId
          ? { ...survey, responseCount: survey.responseCount + 1 }
          : survey,
      ),
    );
    return result.data;
  }
  if (!loaded && pathname !== "/privacy")
    return (
      <main id="main" className="container">
        <div className="empty">
          {loadError ? (
            <>
              <h1>Survey storage is unavailable.</h1>
              <p className="muted" role="alert">
                {loadError}
              </p>
              <button
                type="button"
                className="button secondary"
                onClick={() => window.location.reload()}
              >
                Retry connection
              </button>
            </>
          ) : (
            <p role="status" className="muted">
              Opening your browser’s survey workspace…
            </p>
          )}
        </div>
      </main>
    );
  return (
    <SurveyContext.Provider value={{ surveys, now, addSurvey, changeSurvey, recordResponse }}>
      {children}
    </SurveyContext.Provider>
  );
}

export function useSurveySession() {
  const session = useContext(SurveyContext);
  if (!session)
    throw new Error("Survey session must be used inside its provider.");
  return session;
}
