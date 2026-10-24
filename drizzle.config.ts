import { defineConfig } from "drizzle-kit";

// Tells drizzle-kit where our tables are defined and where to write migration files.
// The database address comes from DATABASE_URL (run through `npm run db:migrate`).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
