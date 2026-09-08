export type SurveyStatus = "Scheduled" | "Open" | "Closed";

// Public metadata only: response text and participant information never belong here.
export type Survey = {
  id: string;
  title: string;
  description: string;
  eligibility: string;
  startsAt: string;
  endsAt: string;
};
export type SurveyInput = Omit<Survey, "id">;

export function surveyStatus(
  survey: Pick<Survey, "startsAt" | "endsAt">,
  now: number,
): SurveyStatus {
  if (now >= Date.parse(survey.endsAt)) return "Closed";
  return now < Date.parse(survey.startsAt) ? "Scheduled" : "Open";
}

export function validateSurvey(input: SurveyInput): string[] {
  const errors: string[] = [];
  if (input.title.trim().length < 3 || input.title.trim().length > 100)
    errors.push("Title must be between 3 and 100 characters.");
  if (
    input.description.trim().length < 10 ||
    input.description.trim().length > 2000
  )
    errors.push("Description must be between 10 and 2,000 characters.");
  if (
    input.eligibility.trim().length < 5 ||
    input.eligibility.trim().length > 500
  )
    errors.push("Eligibility must be between 5 and 500 characters.");
  const start = Date.parse(input.startsAt);
  const end = Date.parse(input.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end))
    errors.push("Choose valid start and end dates.");
  else if (end <= start) errors.push("End date must be after the start date.");
  return errors;
}

export function createSurvey(input: SurveyInput, id: string): Survey {
  const errors = validateSurvey(input);
  if (errors.length) throw new Error(errors.join(" "));
  return {
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    eligibility: input.eligibility.trim(),
    startsAt: new Date(input.startsAt).toISOString(),
    endsAt: new Date(input.endsAt).toISOString(),
  };
}
