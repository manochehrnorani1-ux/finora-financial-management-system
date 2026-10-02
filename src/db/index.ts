import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

// FINORA uses a server-only PostgreSQL connection. Keep DATABASE_URL out of client bundles.

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __finoraPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__finoraPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });

globalForDb.__finoraPostgresqlPool = pool;

export const db = drizzle(pool);
