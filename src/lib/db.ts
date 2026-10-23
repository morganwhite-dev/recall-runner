import { Pool } from "pg";

// One connection pool per server process. Neon's connection string comes from DATABASE_URL.
const globalForPool = globalThis as unknown as { pool?: Pool };

// Neon only accepts encrypted connections. Ask for TLS here so it works even if the
// connection string loses its ?sslmode=require suffix when pasted into a host's env settings.
const url = process.env.DATABASE_URL;
const useTls = Boolean(url && /neon\.tech/.test(url));

export const pool =
  globalForPool.pool ??
  new Pool({
    connectionString: url,
    max: 5,
    ssl: useTls ? { rejectUnauthorized: true } : undefined,
  });

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
