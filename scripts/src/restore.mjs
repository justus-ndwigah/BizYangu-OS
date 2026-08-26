#!/usr/bin/env node
// Server-mode restore: replays a pg_dump SQL backup with psql.
// Usage: npm run restore -- ./backups/biashara-backup-2026-01-01.sql
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";

const execFileAsync = promisify(execFile);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required. Copy .env.example to .env first.");
  process.exit(1);
}

const file = process.argv[2];
if (!file || !existsSync(file)) {
  console.error("Usage: npm run restore -- <path-to-backup.sql>");
  process.exit(1);
}

console.log(`This will OVERWRITE data currently in the database at DATABASE_URL.`);
console.log(`Restoring from ${file} ...`);
try {
  await execFileAsync("psql", [databaseUrl, "-f", file]);
  console.log("Restore complete.");
} catch (err) {
  console.error(
    "psql failed. Make sure PostgreSQL client tools are installed and on your PATH.\n",
    err.message,
  );
  process.exit(1);
}
