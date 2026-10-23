# Recall Runner

An AI agent that watches the US product-recall feed (CPSC), finds the buyers of recalled products in a merchant's PayPal orders, and settles refunds, replacements or repairs through PayPal.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) (2026).

**Status:** Phase 0, setup. Not runnable yet.

## Why

Consumers act on about 6% of recalls announced only by press release, versus about 50% when buyers are notified directly (CPSC FY2013–16 data, as cited by consumer groups and Sedgwick). A merchant who sells through PayPal already holds every buyer's order record, so it can notify buyers directly and settle the remedy in one step.

## Phase tracker

| #   | Phase                                    | Target                       | Status      |
| --- | ---------------------------------------- | ---------------------------- | ----------- |
| 0   | Setup and PayPal spikes                  | Sat Oct 24                   | In progress |
| 1   | Data and CPSC ingest                     | Sun Oct 25                   | Not started |
| 2   | Money core and policy tests              | Tue Oct 27                   | Not started |
| D   | UI design pass                           | Wed Oct 28                   | Not started |
| 3   | AI agent                                 | Sat Oct 31                   | Not started |
| 4   | Buyer page, Log In with PayPal, webhooks | Mon Nov 2                    | Not started |
| 5   | AG Grid dashboard and demo reset         | Thu Nov 5 (feature freeze)   | Not started |
| 7   | Harden and package                       | Fri Nov 6                    | Not started |
| 8   | Video and Devpost write-up               | Mon Nov 9, submit Tue Nov 10 | Not started |

## Phase 0 checklist

- [x] Repo created and pushed public with the MIT license, detected by GitHub (Oct 22): https://github.com/morganwhite-dev/recall-runner
- [x] Next.js app deployed on Render (free plan for now): https://recall-runner.onrender.com (Oct 22)
- [x] Neon database connected: Postgres 18.6, tested from a local script (Oct 22)
- [x] Sandbox order created and captured with a test card, no 3D Secure step (Oct 22)
- [x] Refund succeeds (Oct 22)
- [x] Payout to a sandbox personal account succeeds (Oct 22; PENDING for about 20s, then SUCCESS)
- [ ] Real webhook received and signature verified
- [ ] Log In with PayPal spike (drop on Oct 25 if it fails)
- [ ] Anthropic call succeeds

## Hackathon requirements

- [ ] PayPal sandbox plus an AI model, with PayPal central
- [ ] Working demo with run instructions
- [ ] Public repo with the MIT license shown in the About section
- [ ] Public YouTube video under 3 minutes
- [ ] Sandbox test credentials for judges (README and Devpost testing field)

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in your own values
npm run dev
```

## Tech

Next.js (App Router) and TypeScript, Neon Postgres, AG Grid, PayPal REST APIs, Claude via the Anthropic API.

## Notes for judges

The demo merchant is fictional, seeded order dates are simulated, and the recalls are real CPSC data. This project is not affiliated with the CPSC or PayPal.

## License

MIT, see [LICENSE](LICENSE).
