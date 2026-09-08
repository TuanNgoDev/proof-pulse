import "server-only";
import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;
let database: Database | undefined;

export function getDatabase(): Database {
  if (database) return database;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Survey storage is not configured.");
  const pool = new Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
  // Deliberately omit error details: driver errors may contain connection metadata.
  pool.on("error", () =>
    console.error("ProofPulse database connection interrupted."),
  );
  if (process.env.VERCEL) attachDatabasePool(pool);
  database = drizzle(pool, { schema });
  return database;
}
