import assert from "node:assert/strict";
import test from "node:test";
import {
  createSurvey,
  surveyStatus,
  validateSurvey,
  type SurveyInput,
} from "../src/domain/survey/survey";

const input: SurveyInput = {
  title: "Team pulse",
  description: "A thoughtful team survey.",
  eligibility: "Team members",
  startsAt: "2026-09-01T09:00:00Z",
  endsAt: "2026-09-02T09:00:00Z",
};

test("survey validates fields and normalizes public metadata", () => {
  assert.deepEqual(validateSurvey(input), []);
  assert.equal(
    createSurvey({ ...input, title: "  Team pulse  " }, "one").title,
    "Team pulse",
  );
  assert.equal(
    validateSurvey({ ...input, title: "  ", description: "x", eligibility: "" })
      .length,
    3,
  );
  assert.throws(
    () => createSurvey({ ...input, title: "a".repeat(101) }, "one"),
    /Title/,
  );
});

test("date validation rejects invalid, equal and reversed dates", () => {
  for (const endsAt of ["not-a-date", input.startsAt, "2026-08-01T00:00:00Z"])
    assert.notEqual(validateSurvey({ ...input, endsAt }).length, 0);
  assert.notEqual(validateSurvey({ ...input, startsAt: "" }).length, 0);
});

test("survey opens inclusively and closes exactly at its end", () => {
  const start = Date.parse(input.startsAt),
    end = Date.parse(input.endsAt);
  assert.equal(surveyStatus(input, start - 1), "Scheduled");
  assert.equal(surveyStatus(input, start), "Open");
  assert.equal(surveyStatus(input, end - 1), "Open");
  assert.equal(surveyStatus(input, end), "Closed");
});

test("early closure overrides the scheduled window without changing its end", () => {
  const survey = { ...input, closedAt: "2026-09-01T10:00:00.000Z" };
  assert.equal(surveyStatus(survey, Date.parse("2026-09-01T11:00:00Z")), "Closed");
  assert.equal(survey.endsAt, "2026-09-02T09:00:00Z");
});

test("public survey creation never copies private input fields", () => {
  const withPrivate = {
    ...input,
    response: "private response",
    participantId: "secret",
  };
  const result = createSurvey(withPrivate, "one");
  assert.equal("response" in result, false);
  assert.equal("participantId" in result, false);
});
