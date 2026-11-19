# Recall Runner

Built for the PayPal AI Hackathon 2026.

**Tagline:** An AI agent that finds the buyers of recalled products in a store's PayPal orders and gets them their money back with one tap.

## Inspiration

Most people never hear about a product recall. Consumer groups and Sedgwick, citing CPSC data for FY2013–16, report that consumers act on about 6% of recalls announced only by press release, versus about 50% when buyers are notified directly. The merchant who sold the product already holds every buyer's name, email and payment in its PayPal order records, so the buyer list already exists. Nobody uses it. We built the missing step.

## What it does

Recall Runner watches the US Consumer Product Safety Commission (CPSC) recall feed and does the following:

1. **Matches recalls to the store's catalog.** The AI compares each recall's title, brand and description with the store's products and quotes the evidence it relied on. It also refuses look-alike products that don't match.
2. **Finds the affected buyers in PayPal order records.** Each buyer becomes a case on the merchant's dashboard.
3. **Asks the merchant for one approval.** Nothing is sent or paid before it.
4. **Sends each buyer a personal notice.** The notice quotes the CPSC hazard and remedy word for word.
5. **Lets the buyer claim with one tap.** On a phone, the buyer opens one link that lists all of their recalls and signs in with PayPal once.
6. **Settles the remedy through PayPal.** A refund, a PayPal Payout, a replacement with tracking added to the original order, or a repair claim.

A "Why this happened" timeline tags every step as MODEL (AI), RULE (fixed policy), TOOL (an API call) or YOU (the merchant's decision), so the merchant can see who decided what.

## Why PayPal is central

- **Order records are the buyer list.** The agent finds buyers in PayPal orders.
- **Log In with PayPal proves the buyer.** Before any money moves, the buyer signs in and the verified PayPal email must match the email on the order. A forwarded link can't claim someone else's refund.
- **PayPal's 180-day refund window decides the path.** Orders inside the window are refunded. Older orders are paid with PayPal Payouts.
- **Replacements add tracking to the original order.** The app generates the tracking number (`BH-<case id>`) and adds it to the original PayPal order.
- **Verified webhooks confirm the money.** A case is only marked settled after PayPal's webhook says so.

## How the AI is used, and where it is not

**The AI never moves money.** It matches recalls, investigates with read-only tools, drafts the plan and fills the slots of the buyer notice. Fixed, tested rules choose the payment path and the amount, and the amounts come only from captured line items. Safety guards: evidence quotes must be exact text from the source; a match needs confidence 0.8 or higher; a scan makes at most 8 match calls; a campaign makes at most 12 AI calls; the investigation makes at most 6 lookups; and **Run the AI again** is limited to one per 30 seconds and 12 per hour. If the AI fails, the app falls back to a code-built plan and a template notice.

The money rules have tests on the live Test results page.

## How we built it

- Next.js (App Router, TypeScript) on Render, with Neon Postgres and Drizzle
- Claude Sonnet 5.5 for matching, investigation and notice drafting
- PayPal sandbox: Orders v2, Refunds, Payouts, order tracking, Webhooks and Log In with PayPal
- AG Grid for the dashboard's case grid
- A scheduled GitHub Action pings the site every 10 minutes and pulls recalls from the last 30 days once an hour. It never calls the AI.
- A Postman collection for testing the API

## Challenges

- **CPSC recalls almost never list UPCs or model numbers.** Matching had to work on text, which is why the AI carries the main matching path and shows its evidence.
- **Keeping the AI away from the money.** We split the system so the model can propose and the rules decide.
- **Identity.** The app checks the buyer's verified PayPal email against the email recorded on the order before any money moves.

## Accomplishments we're proud of

- The full flow works live: AI run, approval, notice, one PayPal sign-in, settled.
- A merchant can see exactly where the AI acted and where fixed rules did.
- It handles buyers in different situations, from a recent order that gets a plain refund to an old order past PayPal's refund window that gets a payout.

## What we learned

Agents work best when the model does the fuzzy reading and fixed code does the irreversible part. Showing who decided what builds the merchant's trust.

## What's next

- Run a scheduled AI scan against a real merchant's catalog
- Add email and SMS delivery for notices (today the notices go to an in-app outbox)
- Support more recall sources

## Honest notes about the demo

- Brightnest Home is a fictional store and the order dates are simulated. The recalls are real CPSC recalls with brand names replaced.
- PayPal is the sandbox only. No real money moves.
- The main demo path uses saved AI results so every visitor sees the same story. The dashboard's **Run the AI again** button calls Claude live (rate-limited).

## Try it

- Live demo: https://recall-runner.onrender.com
- Code: https://github.com/morganwhite-dev/recall-runner (MIT license)
- Demo video (30 s, captions): [docs/media/video/recall-runner-live-captioned.mp4](media/video/recall-runner-live-captioned.mp4)

## Try the demo step by step

1. Open https://recall-runner.onrender.com. The first load can take about 30 seconds.
2. Press **Start fresh demo**, then **Approve campaign** on the dashboard.
3. Press **Open buyer page**, then **Confirm with PayPal**.
4. On the PayPal sandbox sign-in page, use the email and password from **Show sandbox login** on the buyer page. These are sandbox accounts with fake money.
5. You land on a receipt. The dashboard then shows the settled amount.

Other buyers are in the **Pick a buyer** menu, each with its own sandbox login.
