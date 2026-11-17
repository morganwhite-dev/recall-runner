ALTER TABLE "buyers" ADD COLUMN "sandbox_key" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "refunded_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "buyers" ADD CONSTRAINT "buyers_sandbox_key_unique" UNIQUE("sandbox_key");--> statement-breakpoint
-- The one sandbox buyer that existed before this migration was found by its email domain.
UPDATE "buyers" SET "sandbox_key" = 'morgan' WHERE "email" LIKE '%@personal.example.com';
