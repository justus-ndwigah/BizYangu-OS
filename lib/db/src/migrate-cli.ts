// Standalone CLI entry point: `npm run migrate` (tsx ./src/migrate-cli.ts).
// Kept separate from migrate.ts so that file can be safely bundled into
// other entry points (e.g. the API server) with zero side effects — see the
// comment at the top of migrate.ts for why that matters.
import { runMigrations } from "./migrate";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required to run migrations. Copy .env.example to .env first.");
  process.exit(1);
}

runMigrations(url, process.env.MIGRATIONS_DIR)
  .then(() => {
    console.log("Migrations applied successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
