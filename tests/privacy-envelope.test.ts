import assert from "node:assert/strict";
import test from "node:test";
import { prepareResponseEnvelope } from "../src/domain/privacy/protocol";

test("response envelopes bind survey and response while exposing only commitment and nullifier", async () => {
  const secret = "11".repeat(32);
  const salt = "22".repeat(32);
  const first = await prepareResponseEnvelope("survey-a", "More quiet space", secret, salt);
  const same = await prepareResponseEnvelope("survey-a", "  More quiet space  ", secret, salt);
  const changedResponse = await prepareResponseEnvelope("survey-a", "Longer opening hours", secret, salt);
  const changedSurvey = await prepareResponseEnvelope("survey-b", "More quiet space", secret, salt);

  assert.deepEqual(first, same);
  assert.match(first.publicEnvelope.commitment, /^[a-f0-9]{64}$/);
  assert.match(first.publicEnvelope.nullifier, /^[a-f0-9]{64}$/);
  assert.equal(first.publicEnvelope.nullifier, changedResponse.publicEnvelope.nullifier);
  assert.notEqual(first.publicEnvelope.commitment, changedResponse.publicEnvelope.commitment);
  assert.notEqual(first.publicEnvelope.nullifier, changedSurvey.publicEnvelope.nullifier);
  assert.equal(JSON.stringify(first.publicEnvelope).includes("quiet"), false);
  assert.equal(JSON.stringify(first.publicEnvelope).includes(secret), false);
  assert.equal(JSON.stringify(first.publicEnvelope).includes(salt), false);
});

test("response envelopes reject malformed identifiers and private entropy", async () => {
  await assert.rejects(prepareResponseEnvelope("", "response", "11".repeat(32), "22".repeat(32)));
  await assert.rejects(prepareResponseEnvelope("survey", " ", "11".repeat(32), "22".repeat(32)));
  await assert.rejects(prepareResponseEnvelope("survey", "response", "short", "22".repeat(32)));
  await assert.rejects(prepareResponseEnvelope("survey", "response", "11".repeat(32), "UPPER".repeat(13)));
});
