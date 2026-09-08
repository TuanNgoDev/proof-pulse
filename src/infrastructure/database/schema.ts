import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const workspaces = pgTable("pp_workspaces", {
  id: varchar("id", { length: 64 }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// No response, identity, proof, or raw browser-token columns exist in this schema.
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
