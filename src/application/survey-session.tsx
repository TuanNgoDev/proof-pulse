"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createSurvey, type Survey, type SurveyInput } from "@/domain/survey/survey";
import { demoSurveys } from "@/infrastructure/demo-surveys";

const SurveyContext = createContext<{
  surveys: Survey[];
  now: number;
  addSurvey: (input: SurveyInput) => Survey;
} | null>(null);

export function SurveySession({ children, initialNow }: { children: React.ReactNode; initialNow: number }) {
  // ponytail: tab memory only; add authenticated persistence when a real organization workflow exists.
  const [surveys, setSurveys] = useState(demoSurveys);
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  function addSurvey(input: SurveyInput) {
    const survey = createSurvey(input, crypto.randomUUID());
    setSurveys((current) => [survey, ...current]);
    return survey;
  }
  return <SurveyContext.Provider value={{ surveys, now, addSurvey }}>{children}</SurveyContext.Provider>;
}

export function useSurveySession() {
  const session = useContext(SurveyContext);
  if (!session) throw new Error("Survey session must be used inside its provider.");
  return session;
}
