import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main() {
  if (process.env.RUN_MIGRATIONS_ON_START === "true") {
    const { runMigrations } = await import("@workspace/db/migrate");
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required to run migrations on start.");
    }
    // MIGRATIONS_DIR must be set explicitly here: this module is bundled by
    // esbuild into this file, which breaks the migrations package's normal
    // "relative to my own source" default path. The desktop app and Docker
    // image both set MIGRATIONS_DIR themselves; see .env.example.
    if (!process.env.MIGRATIONS_DIR) {
      throw new Error(
        "MIGRATIONS_DIR is required when RUN_MIGRATIONS_ON_START=true in a built server " +
          "(point it at lib/db/migrations, or the bundled resources/migrations folder).",
      );
    }
    logger.info("Running database migrations…");
    await runMigrations(process.env.DATABASE_URL, process.env.MIGRATIONS_DIR);
    logger.info("Migrations complete.");
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
