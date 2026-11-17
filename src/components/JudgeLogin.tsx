import { sandboxLogin } from "@/lib/sandbox-buyers";
import { JudgeLoginReveal } from "./JudgeLoginReveal";

// The buyer's PayPal sandbox login, offered to judges on the buyer page so they never have to
// open the README. The values come from the SANDBOX_BUYERS setting (on Render and in .env.local)
// and are only sent to the browser after the visitor asks. Nothing is shown if this buyer has
// no login set.
export function JudgeLogin({
  token,
  sandboxKey,
  className,
  compact,
}: {
  token: string;
  sandboxKey: string | null;
  className?: string;
  compact?: boolean;
}) {
  if (!sandboxLogin(sandboxKey)) return null;
  return <JudgeLoginReveal token={token} className={className} compact={compact} />;
}
