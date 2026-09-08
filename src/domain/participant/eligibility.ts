import { surveyStatus, type Survey } from "../survey/survey";

export type EligibilityResult =
  | { state: "eligible"; surveyId: string; source: "development-only" }
  | { state: "ineligible"; surveyId: string; source: "development-only"; reason: string };

export function canRespond(survey: Survey, result: EligibilityResult | null, now: number): boolean {
  return surveyStatus(survey, now) === "Open" && result?.state === "eligible" && result.surveyId === survey.id;
}

export function validateResponse(survey: Survey, result: EligibilityResult | null, text: string, now: number): string | null {
  if (!canRespond(survey, result, now)) return "This survey must be open and demo eligibility verified before responding.";
  if (text.trim().length < 2 || text.trim().length > 2000) return "Write a response between 2 and 2,000 characters.";
  return null;
}
