import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * App database handle. Uses the pooled (pgbouncer) connection string, so
 * prepared statements are disabled. Privileged work (reading encrypted tokens,
 * draining the job queue) goes through the Supabase service role.
 *
 * The client is created lazily on first use so that `next build` can evaluate
 * modules that import `db` without a DATABASE_URL present.
 */
type DB = PostgresJsDatabase<typeof schema>;

declare global {
  var __jpStudioDb: DB | undefined;
}

function create(): DB {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const supabase = /supabase\.(co|com)/.test(url);
  const sql = postgres(url, {
    prepare: false,
    // one socket per serverless instance; the pooler multiplexes
    max: 1,
    idle_timeout: 20,
    // Supabase requires TLS but presents a cert the default chain rejects
    ssl: supabase ? "require" : undefined,
  });
  return drizzle(sql, { schema, casing: "snake_case" });
}

function getDb(): DB {
  if (!globalThis.__jpStudioDb) globalThis.__jpStudioDb = create();
  return globalThis.__jpStudioDb;
}

export const db: DB = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb() as object, prop, receiver);
  },
});

export { schema };
