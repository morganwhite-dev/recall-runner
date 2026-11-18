// The PayPal sandbox logins judges can use, one per demo buyer, keyed by the buyer's sandbox_key.
// They come from one setting, SANDBOX_BUYERS, a JSON object such as
//   {"morgan": {"email": "sb-...@personal.example.com", "password": "..."}, "recent": {...}}
// The older JUDGE_BUYER_EMAIL / JUDGE_BUYER_PASSWORD pair still works and becomes "morgan".
// These are sandbox test accounts with fake money; they are only sent to a browser on request.

// The buyer the demo starts with, and where made-up buyers' pages point instead.
export const DEFAULT_SANDBOX_BUYER = "morgan";

export type SandboxLogin = { email: string; password: string };

type Env = Record<string, string | undefined>;

export function parseSandboxBuyers(env: Env = process.env): Record<string, SandboxLogin> {
  const out: Record<string, SandboxLogin> = {};
  if (env.JUDGE_BUYER_EMAIL && env.JUDGE_BUYER_PASSWORD) {
    out.morgan = { email: env.JUDGE_BUYER_EMAIL, password: env.JUDGE_BUYER_PASSWORD };
  }
  if (!env.SANDBOX_BUYERS) return out;
  let raw: unknown;
  try {
    // In .env.local the value is wrapped in backticks and the loader strips them; on a host such as
    // Render they arrive as part of the value, so strip one surrounding pair here too.
    raw = JSON.parse(env.SANDBOX_BUYERS.trim().replace(/^`([\s\S]*)`$/, "$1"));
  } catch {
    // A typo in the setting should hide the logins, not break every buyer page.
    console.error("SANDBOX_BUYERS is not valid JSON; no sandbox logins are offered.");
    return {};
  }
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const v = value as Partial<SandboxLogin> | null;
    if (v && typeof v.email === "string" && typeof v.password === "string" && v.email && v.password) {
      out[key] = { email: v.email, password: v.password };
    }
  }
  return out;
}

export function sandboxLogin(key: string | null | undefined): SandboxLogin | null {
  if (!key) return null;
  return parseSandboxBuyers()[key] ?? null;
}
