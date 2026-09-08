import assert from "node:assert/strict";
import test from "node:test";
import { parseSurveyInput } from "../src/application/survey-input";

const valid = {
  title: "Team pulse",
  description: "A useful team survey.",
  eligibility: "Team members",
  startsAt: "2026-09-01T00:00:00.000Z",
  endsAt: "2026-10-01T00:00:00.000Z",
};

test("server boundary rejects malformed payloads and private extra fields", () => {
  for (const value of [
    null,
    [],
    "survey",
    {},
    { ...valid, title: 123 },
    { ...valid, response: "private" },
    { ...valid, workspaceId: "another" },
  ]) {
    assert.throws(() => parseSurveyInput(value));
  }
});

test("server boundary rejects ambiguous dates and invalid domain fields", () => {
  for (const value of [
    { ...valid, startsAt: "2026-09-01T00:00" },
    { ...valid, startsAt: "2026-02-30T00:00:00.000Z" },
    { ...valid, endsAt: valid.startsAt },
    { ...valid, title: "  " },
  ]) {
    assert.throws(() => parseSurveyInput(value));
  }
  assert.deepEqual(
    parseSurveyInput({ ...valid, title: "  Team pulse  " }),
    valid,
  );
});
