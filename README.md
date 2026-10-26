# Recall Runner

An AI agent that watches the US product-recall feed (CPSC), finds the buyers of recalled products in a merchant's PayPal orders, and settles refunds, replacements or repairs through PayPal.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) (2026).

**Status:** Phases 0–5 are complete; Phase 5 (dashboard on real data, approve campaign, demo reset) is done: the live check on Render passed on Oct 26 (refund, replacement and repair all settle). The money core works end to end against the PayPal sandbox. The AI agent matches real CPSC recalls to the store's products, investigates with read-only tools, and drafts checked buyer notices (8 AI tests, 24 of 24 passing). Buyers open a private link, sign in with PayPal (the verified email must match the order), and are refunded or paid out; PayPal's webhook then marks the case settled (checked live on Oct 25: one refund, one payout, one wrong-account refusal). The dashboard, Outbox and Test results pages now read the database and real test runs.

## Why

Consumers act on about 6% of recalls announced only by press release, versus about 50% when buyers are notified directly (CPSC FY2013–16 data, as cited by consumer groups and Sedgwick). A merchant who sells through PayPal already holds every buyer's order record, so it can notify buyers directly and settle the remedy in one step.

## Phase tracker

| #   | Phase                                    | Target                       | Status      |
| --- | ---------------------------------------- | ---------------------------- | ----------- |
| 0   | Setup and PayPal spikes                  | Sat Oct 24                   | Done Oct 22 |
| 1   | Data and CPSC ingest                     | Sun Oct 25                   | Done Oct 23 |
| 2   | Money core and policy tests              | Tue Oct 27                   | Done Oct 23 |
| D   | UI design pass (plum, Claude Design tab) | Wed Oct 28                   | Done Oct 24 |
| 3   | AI agent                                 | Sat Oct 31                   | Done Oct 25 |
| 4   | Buyer page, Log In with PayPal, webhooks | Mon Nov 2                    | Done Oct 25 |
| 5   | AG Grid dashboard and demo reset         | Thu Nov 5 (feature freeze)   | Done Oct 26 |
| 7   | Harden and package                       | Fri Nov 6                    | Not started |
| 8   | Video and Devpost write-up               | Mon Nov 9, submit Tue Nov 10 | Not started |

## Phase 0 checklist

- [x] Repo created and pushed public with the MIT license, detected by GitHub (Oct 22): https://github.com/morganwhite-dev/recall-runner
- [x] Next.js app deployed on Render (free plan for now): https://recall-runner.onrender.com (Oct 22)
- [x] Neon database connected: Postgres 18.6, tested from a local script (Oct 22)
- [x] Sandbox order created and captured with a test card, no 3D Secure step (Oct 22)
- [x] Refund succeeds (Oct 22)
- [x] Payout to a sandbox personal account succeeds (Oct 22; PENDING for about 20s, then SUCCESS)
- [x] Real webhook received and signature verified: PAYMENT.CAPTURE.REFUNDED, verified=true, stored in Neon (Oct 22)
- [x] Log In with PayPal spike: sandbox personal account signed in on the Render URL, PayPal returned a verified email (email_verified true) (Oct 22)
- [x] Anthropic call succeeds from a local script; model id `claude-sonnet-5-5` confirmed (Oct 22)

## Decisions and lessons from Phase 0

- **Seeding works with a test card.** Orders v2 with a card `payment_source` creates and captures an order in one call, with no buyer approval step. Demo orders can be created in code.
- **Payouts are enabled** in the sandbox and settle in about 20 seconds.
- **Webhooks need a registered webhook ID.** Signatures are checked with PayPal's verify endpoint; the simulator's fake events cannot be verified, so test with real refunds.
- **Log In with PayPal code exchange:** send only `grant_type` and `code`, as PayPal's docs show. Adding `redirect_uri` is kept only as a fallback. Keep the "allow unconfirmed emails" option off.
- **Neon needs TLS.** The pool asks for it in code, because the connection string's `sslmode` can be lost when pasted into Render.
- **Render deploys:** the service builds from this GitHub repo and auto-deploys on each push. The free plan sleeps after 15 minutes, so the first visit can take about a minute. The plan moves to a paid instance from Nov 10 through Dec 15.
- **Spike scripts** (`scripts/spike-*.mjs`) re-run each check against the sandbox: `node --env-file=.env.local scripts/spike-paypal.mjs`.

## Hackathon requirements

- [ ] PayPal sandbox plus an AI model, with PayPal central
- [ ] Working demo with run instructions
- [ ] Public repo with the MIT license shown in the About section
- [ ] Public YouTube video under 3 minutes
- [ ] Sandbox test credentials for judges (README and Devpost testing field)

## Try the demo (about 2 minutes)

1. Open the live site and press **Start fresh demo**. It resets the store and opens the store dashboard.
2. **Approve the hand-warmers recall** (you are the store). Nothing is sent or paid until you do. The battery-pack and dresser recalls were approved in advance when the demo was reset, so the buyer sees every remedy: a refund, a replacement and a repair kit.
3. Press **Open buyer page** in the "Try the demo" strip (you are now the customer: the sandbox buyer, whose orders were set up to cover every remedy; the other buyers on the dashboard are fictional). Press **Confirm with PayPal** and sign in with the sandbox buyer account. The login is shown in the "Try the demo" strip on the dashboard and at the bottom of the home page (and in the Devpost testing instructions). A wrong account is refused and nothing is sent.
4. PayPal sends the refund or payout. About a minute later its webhook confirms it, and the dashboard shows the case as **Settled**.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in your own values
npm run dev
```

Database and data commands (all need `.env.local`):

```bash
npm run db:migrate    # create or update the tables in Neon
npm run cpsc:fetch    # refresh data/cpsc-snapshot.json from the CPSC API
npm run cpsc:ingest   # load the snapshot into the recalls table
npm run db:seed       # rebuild the fictional demo store (safe to re-run)
npm run paypal:attach # give every seeded order a real sandbox payment
npm run demo:sandbox-orders # give the sandbox buyer one order of each recalled product
npm run demo:failure-drill  # dry run: shows the one real PayPal failure it would trigger (add -- --go to run it)
npm test              # policy, buyer-identity and dashboard tests
npm run test:record   # run them and save the results the Test results page shows
npm run demo:money    # run every money path against the sandbox
npm run agent:run     # run the AI agent on the demo store and print its audit trail
npm run eval          # run the 8 AI tests, 3 times each
npm run buyer:links   # give each buyer a private link and print them
```

## Tech

Next.js (App Router) and TypeScript, Neon Postgres, AG Grid, PayPal REST APIs, Claude via the Anthropic API.

## Notes for judges

The demo merchant is fictional, seeded order dates are simulated, and the recalls are real CPSC data. This project is not affiliated with the CPSC or PayPal.

## License

MIT, see [LICENSE](LICENSE).
