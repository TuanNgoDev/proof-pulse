import { createSurvey, type SurveyInput } from "@/domain/survey/survey";
import type { PublicResponseEnvelope } from "@/domain/privacy/protocol";

export function parseSurveyInput(value: unknown): SurveyInput {
  const keys = [
    "title",
    "description",
    "eligibility",
    "startsAt",
    "endsAt",
  ] as const;
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Survey fields are required.");
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).some(
      (key) => !keys.includes(key as (typeof keys)[number]),
    ) ||
    keys.some((key) => typeof record[key] !== "string")
  )
    throw new Error("Only public survey fields are accepted.");
  const input = record as SurveyInput;
  for (const date of [input.startsAt, input.endsAt]) {
    if (
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString() !== date
    )
      throw new Error("Dates must use canonical UTC timestamps.");
  }
  const survey = createSurvey(input, "validated");
  return {
    title: survey.title,
    description: survey.description,
    eligibility: survey.eligibility,
    startsAt: survey.startsAt,
    endsAt: survey.endsAt,
  };
}

export function parseResponseEnvelope(value: unknown): PublicResponseEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Response envelope is required.");
  const record = value as Record<string, unknown>;
  const keys = ["surveyId", "commitment", "nullifier"] as const;
  if (
    Object.keys(record).length !== keys.length ||
    keys.some((key) => typeof record[key] !== "string") ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(String(record.surveyId)) ||
    !/^[a-f0-9]{64}$/.test(String(record.commitment)) ||
    !/^[a-f0-9]{64}$/.test(String(record.nullifier))
  )
    throw new Error("Only an opaque survey-bound response envelope is accepted.");
  return {
    surveyId: String(record.surveyId),
    commitment: String(record.commitment),
    nullifier: String(record.nullifier),
  };
}
