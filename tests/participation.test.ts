import assert from "node:assert/strict";
import test from "node:test";
import {
  canRespond,
  validateResponse,
} from "../src/domain/participant/eligibility";
import { verifyDevelopmentEligibility } from "../src/infrastructure/development-eligibility";
import type { Survey } from "../src/domain/survey/survey";

const survey: Survey = {
  id: "team",
  title: "Team pulse",
  description: "A useful question",
  eligibility: "Team members",
  startsAt: "2026-09-01T00:00:00Z",
  endsAt: "2026-09-10T00:00:00Z",
};
const now = Date.parse("2026-09-08T00:00:00Z");

test("demo eligibility has explicit eligible and ineligible outcomes", async () => {
  const yes = await verifyDevelopmentEligibility(survey.id, "eligible");
  const no = await verifyDevelopmentEligibility(survey.id, "ineligible");
  assert.equal(yes.source, "development-only");
  assert.equal(canRespond(survey, yes, now), true);
  assert.equal(canRespond(survey, no, now), false);
  assert.equal(canRespond(survey, null, now), false);
});

test("an eligibility result is bound to its own survey and open window", async () => {
  const result = await verifyDevelopmentEligibility(survey.id, "eligible");
  assert.equal(canRespond({ ...survey, id: "another" }, result, now), false);
  assert.equal(
    canRespond(survey, result, Date.parse(survey.startsAt) - 1),
    false,
  );
  assert.equal(canRespond(survey, result, Date.parse(survey.endsAt)), false);
});

test("private response flow rejects whitespace, oversize input and late submission", async () => {
  const result = await verifyDevelopmentEligibility(survey.id, "eligible");
  assert.equal(
    validateResponse(survey, result, "More quiet spaces, please.", now),
    null,
  );
  assert.match(validateResponse(survey, result, "  ", now)!, /between/);
  assert.match(
    validateResponse(survey, result, "a".repeat(2001), now)!,
    /between/,
  );
  assert.match(
    validateResponse(
      survey,
      result,
      "Valid response",
      Date.parse(survey.endsAt),
    )!,
    /open/,
  );
  assert.match(
    validateResponse(survey, null, "Valid response", now)!,
    /verified/,
  );
});
