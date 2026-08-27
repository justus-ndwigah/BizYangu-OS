import { defineConfig } from "drizzle-kit";

// `generate` only reads the TS schema and does not need a live connection,
// so we fall back to a placeholder URL for that command. `push`, `migrate`,
// and `studio` do need a real DATABASE_URL set in the environment.
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost:5432/placeholder";

// Plain relative paths (forward slashes), resolved by drizzle-kit relative
// to this config file's own directory. Deliberately NOT built from
// __dirname/path.join(): drizzle-kit resolves `schema`/`out` via glob
// matching, which treats backslash as an escape character rather than a
// path separator (breaking on Windows, where path.join produces
// backslashes) - and separately, drizzle-kit prepends its own base path
// rather than detecting an already-absolute path, so even a forward-slash
// absolute path ends up double-prefixed. Plain relative strings avoid both
// problems entirely.
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});