import { Pool } from "pg";

// One connection pool per server process. Neon's connection string comes from DATABASE_URL.
const globalForPool = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForPool.pool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

if (process.env.NODE_ENV !== "production") globalForPool.pool = pool;

// Phase 0 spike table. Phase 1 replaces this with proper Drizzle migrations.
let ready: Promise<unknown> | null = null;
export function ensureWebhookTable() {
  ready ??= pool.query(`
    create table if not exists webhook_events (
      id bigserial primary key,
      paypal_event_id text unique not null,
      event_type text not null,
      verified boolean not null,
      received_at timestamptz not null default now()
    )
  `);
  return ready;
}
