import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
  unique,
} from "drizzle-orm/pg-core";

export const workspaces = pgTable("pp_workspaces", {
  id: varchar("id", { length: 64 }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Raw response text, identity, proof material, and browser tokens never enter this schema.
export const surveys = pgTable(
  "pp_surveys",
  {
    workspaceId: varchar("workspace_id", { length: 64 })
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    id: text("id").notNull(),
    title: varchar("title", { length: 100 }).notNull(),
    description: varchar("description", { length: 2000 }).notNull(),
    eligibility: varchar("eligibility", { length: 500 }).notNull(),
    startsAt: timestamp("starts_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    endsAt: timestamp("ends_at", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.id] }),
    check("pp_surveys_date_order", sql`${table.endsAt} > ${table.startsAt}`),
    check("pp_surveys_title_length", sql`length(btrim(${table.title})) >= 3`),
    check(
      "pp_surveys_description_length",
      sql`length(btrim(${table.description})) >= 10`,
    ),
    check(
      "pp_surveys_eligibility_length",
      sql`length(btrim(${table.eligibility})) >= 5`,
    ),
  ],
);

export const responseCommitments = pgTable(
  "pp_response_commitments",
  {
    workspaceId: varchar("workspace_id", { length: 64 })
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    surveyId: text("survey_id").notNull(),
    id: varchar("id", { length: 64 }).notNull(),
    commitment: varchar("commitment", { length: 64 }).notNull(),
    nullifier: varchar("nullifier", { length: 64 }).notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.id] }),
    foreignKey({
      columns: [table.workspaceId, table.surveyId],
      foreignColumns: [surveys.workspaceId, surveys.id],
    }).onDelete("cascade"),
    unique("pp_response_commitments_nullifier").on(
      table.workspaceId,
      table.surveyId,
      table.nullifier,
    ),
    unique("pp_response_commitments_value").on(
      table.workspaceId,
      table.surveyId,
      table.commitment,
    ),
    check(
      "pp_response_commitments_hex",
      sql`${table.commitment} ~ '^[a-f0-9]{64}$' AND ${table.nullifier} ~ '^[a-f0-9]{64}$'`,
    ),
  ],
);
