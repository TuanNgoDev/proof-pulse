import assert from "node:assert/strict";
import test from "node:test";
import {
  getOrCreateParticipantSecret,
  prepareResponseEnvelope,
} from "../src/domain/privacy/protocol";

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

test("browser participant secrets stay stable per survey and replace malformed storage", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  const first = getOrCreateParticipantSecret("survey-a", storage);
  assert.equal(getOrCreateParticipantSecret("survey-a", storage), first);
  assert.notEqual(getOrCreateParticipantSecret("survey-b", storage), first);
  values.set("proofpulse:participant:survey-a", "broken");
  assert.match(getOrCreateParticipantSecret("survey-a", storage), /^[a-f0-9]{64}$/);
});
