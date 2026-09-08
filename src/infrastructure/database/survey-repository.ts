import "server-only";
import { randomUUID } from "node:crypto";
import { count, desc, eq, getTableColumns } from "drizzle-orm";
import { createSurvey, type Survey } from "@/domain/survey/survey";
import { parseSurveyInput } from "@/application/survey-input";
import { demoSurveys } from "../demo-surveys";
import { getDatabase, type Database } from "./client";
import { surveys, workspaces } from "./schema";

const { id, title, description, eligibility, startsAt, endsAt } =
  getTableColumns(surveys);
const publicColumns = { id, title, description, eligibility, startsAt, endsAt };

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
