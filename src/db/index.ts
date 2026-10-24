import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "@/lib/db";
import * as schema from "./schema";

// The app's database handle. It reuses the Neon connection pool from src/lib/db.ts, so there
// is still one set of connections, and the schema gives every query full TypeScript checking.
export const db = drizzle(pool, { schema });
export * from "./schema";
