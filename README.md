# Recall Runner

> Most people never hear about a product recall. Consumers act on about 6% of recalls announced only by press release, versus about 50% when buyers are notified directly (CPSC FY2013–16 data, as cited by consumer groups and Sedgwick).

The store that sold the product already has every buyer's name, email and payment in its PayPal orders, but nothing connects that list to the recall. **Recall Runner connects it.** An AI agent watches the US recall feed (CPSC), matches each recall to the store's products, and finds the affected buyers in the PayPal orders. The merchant approves once. Each buyer gets a private link, signs in with PayPal, and is refunded, paid out, sent a replacement or given a repair claim, all through PayPal. Fixed rules, not the AI, choose the payment path and the amount.

Built for the PayPal AI Hackathon 2026. The full flow works end to end against the PayPal sandbox.

## Demo video and screenshots

- Live demo: https://recall-runner.onrender.com
- Video (30 s, captions, no narration): [docs/media/video/recall-runner-live-captioned.mp4](docs/media/video/recall-runner-live-captioned.mp4)
- Screenshots from a live run on Render: [docs/media/screenshots/](docs/media/screenshots/)
- Project write-up: [docs/writeup.md](docs/writeup.md)

## How it works

- `src/lib/agent/`: the AI agent. `scan-recall.ts` and `pipeline.ts` run a scan, `match.ts` matches a recall to the store's products, `investigate.ts` checks the order records with read-only lookups and drafts a plan, `notice.ts` fills the buyer notice, and `llm.ts` wraps the Anthropic calls.
- `src/lib/policy.ts`: fixed money rules. Orders inside the 180-day `REFUND_WINDOW_DAYS` are refunded; older orders are paid with PayPal Payouts. The AI never picks the path or the amount.
- `src/lib/executor.ts` and `src/lib/paypal-client.ts`: the PayPal calls (refunds, payouts, order tracking).
- `src/lib/settle.ts` and `src/app/api/webhooks/paypal`: a verified PayPal webhook is what marks a case settled.
- `src/app/r/[token]`: the private buyer page, with Log In with PayPal.
- `src/app/dashboard`: the merchant dashboard. `src/app/evals`: the Test results page.
- `src/app/api/cron/sync-recalls`: pulls the last 30 days of CPSC recalls. It never calls the AI.
- CI (`.github/workflows/ci.yml`) runs lint, typegen, `tsc`, tests and a build on every push and pull request.

AI guardrails: a match needs confidence 0.8 or higher, a scan makes at most 8 match calls, and one campaign makes at most 12 AI calls. If the AI fails, the app falls back to a code-built plan and a template notice.

## Notes on the PayPal integration

- **Seeding works with a test card.** Orders v2 with a card `payment_source` creates and captures an order in one call, with no buyer approval step. Demo orders can be created in code.
- **Payouts are enabled** in the sandbox and settle in about 20 seconds.
- **Webhooks need a registered webhook ID.** Signatures are checked with PayPal's verify endpoint. The simulator's fake events cannot be verified, so test with real refunds.
- **Log In with PayPal code exchange:** send only `grant_type` and `code`, as PayPal's docs show. Adding `redirect_uri` is kept only as a fallback. Keep the "allow unconfirmed emails" option off.
- **Neon needs TLS.** The pool asks for it in code, because the connection string's `sslmode` can be lost when pasted into Render.
- **Render:** the service builds from this GitHub repo and auto-deploys on each push. The free plan sleeps after 15 minutes of no traffic. `.github/workflows/keep-awake.yml` pings `/api/health` every 10 minutes and calls `/api/cron/sync-recalls` hourly. It needs the repo variable `SITE_URL` and the secret `CRON_SECRET` (the same value as on Render).
- **Spike scripts** (`scripts/spike-*.mjs`) re-run each check against the sandbox: `node --env-file=.env.local scripts/spike-paypal.mjs`.

## Sandbox test logins

These are PayPal **sandbox** buyer accounts (fake money, not real PayPal accounts). Use one on PayPal's sandbox sign-in page after you press **Confirm with PayPal** on that buyer's page. Each buyer's page has a **Show sandbox login** button that reveals its email and password, so the passwords are not written here. On the dashboard, the **Pick a buyer** menu in the "Try the demo" strip lists them all.

| Buyer | Sandbox email | What happens |
|---|---|---|
| Morgan Demo | `sb-cpwe353506970@personal.example.com` | Three recalls, three remedies: a refund, a replacement and a repair. The main walkthrough. |
| Riley Brooks | `sb-afmdp53964320@personal.example.com` | Bought 30 days ago, inside PayPal's 180-day window, so the payment is refunded. |
| Owen Hartley | `sb-ypvbk53965313@personal.example.com` | Bought 250 days ago, past the window, so PayPal Payouts pays them. |
| Parker Lane | `sb-fjp8653965203@personal.example.com` | The store already refunded $10.00 of $34.00, so only the $24.00 left is paid. |
| Casey Whitfield | `sb-dpfli53965148@personal.example.com` | The store has a different email on the order, so signing in is refused and nothing is paid. |
| Jordan Ellis | `sb-wzjvp53965112@personal.example.com` | A toy recall that offers a refund or a replacement; the buyer chooses. |

Passwords are set with the `SANDBOX_BUYERS` setting (see `.env.example`).

## Try the demo (about 2 minutes)

1. Open the live site and press **Start fresh demo**. It resets the store and opens the store dashboard.
2. **Approve the hand-warmers recall** (you are the store). Nothing is sent or paid until you do. The battery-pack and dresser recalls were approved in advance when the demo was reset, so the buyer sees every remedy: a refund, a replacement and a repair kit.
3. Press **Open buyer page** in the "Try the demo" strip at the top of the dashboard (you are now the customer: the sandbox buyer, whose orders were set up to cover every remedy; the other buyers on the dashboard are fictional). Press **Confirm with PayPal** and sign in with the sandbox buyer account. Press **Show sandbox login** under the Confirm with PayPal button to see the test email and password. A wrong account is refused and nothing is sent.
   Note: the demo store is shared by everyone, so if two people use it at once, one person's **Start fresh demo** resets the other's run.
4. PayPal sends the refund or payout. About a minute later its webhook confirms it, and the dashboard shows the case as **Settled**.

## Prerequisites

- Node 24 (the version CI uses)
- A Neon Postgres database
- A PayPal sandbox app (client ID, secret and a webhook ID)
- An Anthropic API key

## Environment

Copy `.env.example` to `.env.local` and fill in your own values:

- `PAYPAL_ENV`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`: your PayPal sandbox app
- `ANTHROPIC_API_KEY`: used by the AI agent
- `DATABASE_URL`: your Neon connection string
- `SANDBOX_BUYERS`: one PayPal sandbox login per demo buyer, as JSON
- `CRON_SECRET`: protects the scheduled recall sync
- `AGENT_MODEL` (optional): overrides the default `claude-sonnet-5-5`
- `JUDGE_BUYER_EMAIL` and `JUDGE_BUYER_PASSWORD` (legacy): still read by `src/lib/sandbox-buyers.ts`, where they become the buyer `morgan`

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in your own values
```

First run, in this order:

```bash
npm run db:migrate           # create the tables in Neon
npm run cpsc:ingest          # load the recall snapshot
npm run db:seed              # build the fictional demo store
npm run paypal:attach        # give every seeded order a real sandbox payment (calls PayPal sandbox)
npm run demo:sandbox-orders  # give the sandbox buyer one order of each recalled product (calls PayPal sandbox)
npm run demo:add-buyers      # add the five extra sandbox buyers
```

After the data commands finish, start the local server and leave it running:

```bash
npm run dev
```

`npm test` needs no secrets. `npm run eval` calls the live Anthropic API and costs money. `npm run demo:money`, `npm run paypal:attach` and `npm run demo:sandbox-orders` hit the PayPal sandbox, so fill in the PayPal variables first.

Other commands (all but `cpsc:fetch`, `test` and `test:record` need `.env.local`):

```bash
npm run cpsc:fetch    # refresh data/cpsc-snapshot.json from the CPSC API
npm run db:rename-brands # rename real brand names already stored in the database (mapping: src/lib/brand-aliases.ts)
npm run demo:failure-drill  # dry run: shows the one real PayPal failure it would trigger (add -- --go to run it)
npm test              # all 97 tests: 96 pass, 1 skipped (needs no secrets)
npm run test:record   # run the 90 core tests (10 files) and save the results the Test results page shows
npm run demo:money    # run every money path against the sandbox
npm run agent:run     # run the AI agent on the demo store and print its audit trail (calls Anthropic)
npm run eval          # run the 8 AI tests, 3 times each (calls Anthropic, costs money)
npm run buyer:links   # give each buyer a private link and print them
```

The last full run of the AI tests passed 24 of 24 (8 cases, 3 attempts each) on Oct 28; see `data/eval-results.json`.

## Tech

Next.js (App Router) and TypeScript, Neon Postgres, AG Grid, PayPal REST APIs, Claude via the Anthropic API.

## Notes

The demo merchant is fictional, seeded order dates are simulated, and the recalls are real CPSC recalls, with brand names replaced. This project is not affiliated with the CPSC or PayPal.

## License

MIT, see [LICENSE](LICENSE).
