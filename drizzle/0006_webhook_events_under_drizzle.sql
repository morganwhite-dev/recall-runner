-- The table already exists in production (it was created by the Phase 0 raw SQL), so this is
-- written to do nothing there and to create it on a fresh database.
CREATE TABLE IF NOT EXISTS "webhook_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"paypal_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"verified" boolean NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_paypal_event_id_unique" UNIQUE("paypal_event_id")
);
