CREATE TABLE "login_attempt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" text NOT NULL,
	"case_id" uuid NOT NULL,
	"choice" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "login_attempts" ALTER COLUMN "case_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "login_attempts" ALTER COLUMN "choice" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "login_attempts" ADD COLUMN "buyer_id" uuid;--> statement-breakpoint
ALTER TABLE "login_attempt_items" ADD CONSTRAINT "login_attempt_items_state_login_attempts_state_fk" FOREIGN KEY ("state") REFERENCES "public"."login_attempts"("state") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_attempt_items" ADD CONSTRAINT "login_attempt_items_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE cascade ON UPDATE no action;