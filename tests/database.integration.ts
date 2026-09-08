import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  loadWorkspaceSurveys,
  saveWorkspaceSurvey,
} from "../src/infrastructure/database/survey-repository";
import {
  newWorkspaceToken,
  workspaceKey,
} from "../src/infrastructure/workspace-token";
import * as schema from "../src/infrastructure/database/schema";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

test("PostgreSQL seeds once, persists refresh reads and isolates browser workspaces", async () => {
  assert.ok(
    process.env.TEST_DATABASE_URL,
    "Set TEST_DATABASE_URL to a migrated test database; this check does not silently skip.",
  );
  const pool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL,
    max: 2,
  });
  const db = drizzle(pool, { schema });
  const key = workspaceKey(newWorkspaceToken()),
    otherKey = workspaceKey(newWorkspaceToken());
  try {
    const [first, concurrent] = await Promise.all([
      loadWorkspaceSurveys(key, db),
      loadWorkspaceSurveys(key, db),
    ]);
    assert.equal(first.length, 4);
    assert.equal(concurrent.length, 4);
    const input = {
      title: "Persistent survey",
      description: "A saved survey for integration testing.",
      eligibility: "Test participants",
      startsAt: "2026-01-01T00:00:00.000Z",
      endsAt: "2030-01-01T00:00:00.000Z",
    };
    const saved = await saveWorkspaceSurvey(key, input, db);
    const reloaded = await loadWorkspaceSurveys(key, db);
    assert.equal(reloaded.length, 5);
    assert.equal(
      reloaded.find((survey) => survey.id === saved.id)?.title,
      input.title,
    );
    const other = await loadWorkspaceSurveys(otherKey, db);
    assert.equal(other.length, 4);
    assert.equal(
      other.some((survey) => survey.id === saved.id),
      false,
    );
    assert.equal("workspaceId" in saved, false);
    assert.equal("response" in saved, false);
    await assert.rejects(
      saveWorkspaceSurvey(
        key,
        { ...input, response: "Must never be stored" },
        db,
      ),
    );
    await assert.rejects(
      db.insert(schema.surveys).values({
        ...input,
        id: "invalid-window",
        workspaceId: key,
        endsAt: input.startsAt,
      }),
    );
    assert.equal((await loadWorkspaceSurveys(key, db)).length, 5);
    await db
      .insert(schema.surveys)
      .values(
        Array.from({ length: 494 }, (_, index) => ({
          ...input,
          id: `capacity-${index}`,
          workspaceId: key,
        })),
      );
    const competing = await Promise.allSettled([
      saveWorkspaceSurvey(key, input, db),
      saveWorkspaceSurvey(key, input, db),
    ]);
    assert.equal(
      competing.filter((result) => result.status === "fulfilled").length,
      1,
      "Only one concurrent create may claim the final slot.",
    );
    assert.equal((await loadWorkspaceSurveys(key, db)).length, 500);
    await db
      .insert(schema.surveys)
      .values({ ...input, id: "direct-operator-row", workspaceId: key });
    assert.equal(
      (await loadWorkspaceSurveys(key, db)).length,
      500,
      "List reads are bounded even if an operator inserts an extra row.",
    );
  } finally {
    // Delete only the two randomly generated test workspaces; FK cascade removes their test surveys.
    try {
      await db
        .delete(schema.workspaces)
        .where(inArray(schema.workspaces.id, [key, otherKey]));
    } finally {
      await pool.end();
    }
  }
});
