"use server";

// Returns the sandbox buyer's login when a visitor presses "Show sandbox login". It is read on
// demand instead of being written into the page, so the page HTML never contains an email and
// password next to a PayPal button (that combination is what browser phishing checks look for).
// It is a PayPal SANDBOX test account with fake money, so showing it on request is intended.
export async function revealJudgeLogin(): Promise<{
  email: string;
  password: string;
} | null> {
  const email = process.env.JUDGE_BUYER_EMAIL;
  const password = process.env.JUDGE_BUYER_PASSWORD;
  return email && password ? { email, password } : null;
}
