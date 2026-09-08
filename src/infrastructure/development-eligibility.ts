import type { EligibilityResult } from "@/domain/participant/eligibility";

// Explicit UI simulator, intentionally not an implementation of ParticipationProtocol.
// It issues no proof and cannot authorize any production submission.
export async function verifyDevelopmentEligibility(surveyId: string, outcome: "eligible" | "ineligible"): Promise<EligibilityResult> {
  return outcome === "eligible"
    ? { state: "eligible", surveyId, source: "development-only" }
    : { state: "ineligible", surveyId, source: "development-only", reason: "This demo participant does not meet the survey requirement." };
}
