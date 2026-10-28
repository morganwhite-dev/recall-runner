import { JudgeLoginReveal } from "./JudgeLoginReveal";

// The sandbox buyer's PayPal login, offered to judges on the buyer page so they never have to
// open the README. The values come from two environment variables (set on Render and in
// .env.local) and are only sent to the browser after the visitor asks. Nothing is shown if
// either variable is missing.
export function JudgeLogin({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  if (!process.env.JUDGE_BUYER_EMAIL || !process.env.JUDGE_BUYER_PASSWORD)
    return null;
  return <JudgeLoginReveal className={className} compact={compact} />;
}
