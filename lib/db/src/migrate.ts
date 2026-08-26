// Runs all pending SQL migrations from a migrations folder against DATABASE_URL.
// Safe to run every time the app starts — drizzle tracks what's already applied.
//
// IMPORTANT: this file has no top-level side effects. It's imported both by
// the standalone CLI (migrate-cli.ts) AND bundled directly into the API
// server (for RUN_MIGRATIONS_ON_START). A self-executing "if run directly"
// block here would be unsafe: once esbuild inlines this code into another
// entry point, `import.meta.url` and `process.argv[1]` both point at that
// OTHER entry point and can spuriously match, running migrations twice
// concurrently. Keep any CLI-only logic in migrate-cli.ts instead.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Defaults to the migrations folder next to this package's source — correct
// when running un-bundled (e.g. via migrate-cli.ts with tsx). Bundlers
// (esbuild) inline this file's code into a different output location, which
// breaks that relative path, so bundled consumers (the API server, the
// desktop app) MUST pass an explicit `migrationsFolder` — see MIGRATIONS_DIR
// in api-server/src/index.ts.
const DEFAULT_MIGRATIONS_FOLDER = path.join(__dirname, "..", "migrations");

export async function runMigrations(
  databaseUrl: string,
  migrationsFolder: string = DEFAULT_MIGRATIONS_FOLDER,
): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder });
  await pool.end();
}
