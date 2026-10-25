CREATE TABLE "buyer_links" (
	"token" text PRIMARY KEY NOT NULL,
	"buyer_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "buyer_links_buyer_id_unique" UNIQUE("buyer_id")
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"state" text PRIMARY KEY NOT NULL,
	"case_id" uuid NOT NULL,
	"choice" text NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "verified_email" text;--> statement-breakpoint
ALTER TABLE "cases" ADD COLUMN "settled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "buyer_links" ADD CONSTRAINT "buyer_links_buyer_id_buyers_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."buyers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;