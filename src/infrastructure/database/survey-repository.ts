import "server-only";
import { randomUUID } from "node:crypto";
import { and, count, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { createSurvey, surveyStatus, type Survey } from "@/domain/survey/survey";
import {
  parseResponseEnvelope,
  parseSurveyInput,
} from "@/application/survey-input";
import type { PublicResponseEnvelope } from "@/domain/privacy/protocol";
import { demoSurveys } from "../demo-surveys";
import { getDatabase, type Database } from "./client";
import { responseCommitments, surveys, workspaces } from "./schema";

const { id, title, description, eligibility, startsAt, endsAt, closedAt } =
  getTableColumns(surveys);
const publicColumns = { id, title, description, eligibility, startsAt, endsAt, closedAt };

export async function changeWorkspaceSurvey(
  key: string,
  surveyId: string,
  operation: "edit" | "close" | "check",
  input?: unknown,
  db: Database = getDatabase(),
): Promise<Survey> {
  if (typeof surveyId !== "string" || !surveyId || surveyId.length > 100)
    throw new RangeError("Invalid survey identifier.");
  if (!["edit", "close", "check"].includes(operation))
    throw new RangeError("Invalid survey operation.");
  if (operation !== "edit" && input !== undefined)
    throw new RangeError("Only the survey identifier is accepted.");
  const fields = operation === "edit" ? parseSurveyInput(input) : undefined;
  return db.transaction(async (tx) => {
    const scope = and(eq(surveys.workspaceId, key), eq(surveys.id, surveyId));
    const [current] = await tx.select(publicColumns).from(surveys).where(scope).for("update");
    if (!current) throw new RangeError("Survey is unavailable in this workspace.");
    // Read the database wall clock after acquiring the row lock: queued edits cannot reopen it.
    const clock = await tx.execute<{ now: string }>(sql`select clock_timestamp()::text as now`);
    const time = Date.parse(clock.rows[0].now);
    const status = surveyStatus(current, time);
    if (operation === "edit") {
      if (status !== "Scheduled" || !fields || Date.parse(fields.startsAt) <= time)
        throw new RangeError("Only not-yet-open surveys can be edited; choose a future start.");
      const [saved] = await tx.update(surveys).set(fields).where(scope).returning(publicColumns);
      return saved;
    }
    if (status !== "Open") throw new RangeError("This survey is no longer open. Refresh its details.");
    if (operation === "check") return current;
    const [saved] = await tx.update(surveys).set({ closedAt: new Date(time).toISOString() }).where(scope).returning(publicColumns);
    return saved;
  });
}

export async function loadWorkspaceSurveys(
  key: string,
  db: Database = getDatabase(),
): Promise<Survey[]> {
  return db.transaction(async (tx) => {
    const created = await tx
      .insert(workspaces)
      .values({ id: key })
      .onConflictDoNothing()
      .returning({ id: workspaces.id });
    if (created.length)
      await tx
        .insert(surveys)
        .values(demoSurveys.map((survey) => ({ ...survey, workspaceId: key })));
    return tx
      .select(publicColumns)
      .from(surveys)
      .where(eq(surveys.workspaceId, key))
      .orderBy(desc(surveys.createdAt), surveys.id)
      .limit(500);
  });
}

export async function saveWorkspaceSurvey(
  key: string,
  input: unknown,
  db: Database = getDatabase(),
): Promise<Survey> {
  const survey = createSurvey(parseSurveyInput(input), randomUUID());
  return db.transaction(async (tx) => {
    const workspace = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.id, key))
      .for("update");
    if (!workspace.length) throw new Error("Workspace unavailable.");
    const [total] = await tx
      .select({ value: count() })
      .from(surveys)
      .where(eq(surveys.workspaceId, key));
    if (total.value >= 500)
      throw new RangeError("Workspace survey limit reached.");
    const [saved] = await tx
      .insert(surveys)
      .values({ ...survey, workspaceId: key })
      .returning(publicColumns);
    return saved;
  });
}

export async function recordResponseCommitment(
  key: string,
  input: PublicResponseEnvelope,
  db: Database = getDatabase(),
) {
  const envelope = parseResponseEnvelope(input);
  return db.transaction(async (tx) => {
    const scope = and(
      eq(surveys.workspaceId, key),
      eq(surveys.id, envelope.surveyId),
    );
    const [survey] = await tx
      .select(publicColumns)
      .from(surveys)
      .where(scope)
      .for("update");
    if (!survey) throw new RangeError("Survey is unavailable in this workspace.");
    const clock = await tx.execute<{ now: string }>(
      sql`select clock_timestamp()::text as now`,
    );
    if (surveyStatus(survey, Date.parse(clock.rows[0].now)) !== "Open")
      throw new RangeError("This survey is no longer open. Refresh its details.");
    const [total] = await tx
      .select({ value: count() })
      .from(responseCommitments)
      .where(
        and(
          eq(responseCommitments.workspaceId, key),
          eq(responseCommitments.surveyId, envelope.surveyId),
        ),
      );
    if (total.value >= 500)
      throw new RangeError("This survey has reached its response receipt limit.");
    const [created] = await tx
      .insert(responseCommitments)
      .values({
        workspaceId: key,
        surveyId: envelope.surveyId,
        id: randomUUID(),
        commitment: envelope.commitment,
        nullifier: envelope.nullifier,
      })
      .onConflictDoNothing()
      .returning();
    if (!created)
      throw new RangeError("This participation nullifier was already used.");
    return {
      id: created.id,
      surveyId: created.surveyId,
      commitment: created.commitment,
      nullifier: created.nullifier,
      submittedAt: new Date(created.submittedAt).toISOString(),
    };
  });
}
