import { defineConfig } from "drizzle-kit";
import path from "path";

// `generate` only reads the TS schema and does not need a live connection,
// so we fall back to a placeholder URL for that command. `push`, `migrate`,
// and `studio` do need a real DATABASE_URL set in the environment.
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./migrations"),
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
