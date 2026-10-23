// Phase 0 spike: prove the Anthropic API key works and the model id we plan to use is valid.
// Run: node --env-file=.env.local scripts/spike-anthropic.mjs
// Prints only the model, a short reply and token counts, never the key.

const MODEL = "claude-sonnet-5-5";
const key = process.env.ANTHROPIC_API_KEY;

if (!key) {
  console.error("FAIL  ANTHROPIC_API_KEY is empty in .env.local");
  process.exit(1);
}

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: MODEL,
    max_tokens: 40,
    messages: [{ role: "user", content: "Reply with exactly: recall runner online" }],
  }),
});

const json = await res.json().catch(() => ({}));
if (!res.ok) {
  console.log(`FAIL  Anthropic call  HTTP ${res.status}  ${json.error?.type ?? ""}: ${json.error?.message ?? ""}`);
  process.exit(1);
}

console.log("PASS  Anthropic call  HTTP", res.status);
console.log("      model:", json.model);
console.log("      reply:", json.content?.[0]?.text);
console.log("      tokens in/out:", json.usage?.input_tokens, "/", json.usage?.output_tokens);
