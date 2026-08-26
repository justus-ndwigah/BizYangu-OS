#!/usr/bin/env node
// Server-mode backup: dumps the Postgres database with pg_dump.
// (The desktop app has its own file-level backup via the "Data" menu —
// this script is for `npm run backup` on a server/self-hosted install.)
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required. Copy .env.example to .env first.");
  process.exit(1);
}

const backupDir = process.env.BACKUP_DIR ?? path.resolve(__dirname, "..", "..", "backups");
if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = path.join(backupDir, `biashara-backup-${timestamp}.sql`);

console.log(`Backing up database to ${outFile} ...`);
try {
  await execFileAsync("pg_dump", ["--no-owner", "--no-privileges", "-f", outFile, databaseUrl]);
  console.log("Backup complete.");
} catch (err) {
  console.error(
    "pg_dump failed. Make sure PostgreSQL client tools are installed and on your PATH.\n",
    err.message,
  );
  process.exit(1);
}
