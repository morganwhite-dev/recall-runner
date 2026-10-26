ALTER TABLE "login_attempts" DROP CONSTRAINT "login_attempts_case_id_cases_id_fk";
--> statement-breakpoint
ALTER TABLE "login_attempts" DROP COLUMN "case_id";--> statement-breakpoint
ALTER TABLE "login_attempts" DROP COLUMN "choice";