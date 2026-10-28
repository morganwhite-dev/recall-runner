# Handoff: Recall Runner dashboard redesign (direction 2a, "Plum civic")

## Overview
A redesign of `/dashboard` in morganwhite-dev/recall-runner. It keeps the approved plum palette and fonts (docs/design/PLUM-DESIGN.md) and changes the layout:
- a full-height plum **sidebar** that replaces the campaign `<select>`
- a one-line **demo stepper** across the top
- a compact **recall header** with an animated product illustration and a **progress card**
- the **Cases table** with an **Activity feed** under it, next to a full-height **detail panel**
- a **live settle** animation: a pending payment turns Settled, a toast appears and the money counts up

It also fixes findings F3, F4, F5, F7 and F11 from docs/ux-walkthrough/REPORT.md.

## About the design files
`Dashboard.dc.html` is a **design reference built in HTML**, not production code. Open it in a browser with `support.js` next to it.
- **The task:** recreate it inside the existing Next.js App Router code (CSS Modules, AG Grid, server components plus small client components), following the patterns already in `src/app/dashboard/`.
- **Don't copy:** the inline styles or the `{{ }}` template syntax.
- **Mock data:** all data in the file is hard-coded. The real values come from `loadDashboard()`.

## Fidelity
**High fidelity.**
- Colors, type, spacing, radii and motion are final.
- Icons in the mock are text glyphs (✓ ↩ ➚ ✉ ⚖ ✦). Use the real `<Icon>` set from `src/components/Icon.tsx` in their place.

## File-by-file change plan
| Repo file | Change |
| --- | --- |
| `src/app/dashboard/page.tsx` | New shell: `<aside>` sidebar + `<main>`. Remove the plum `<header>` band, the KPI `<dl>` and the "How money moves" section. Render `<DemoStepper>`, the `<RecallHeader>` row with `<ProgressCard>`, then `<Workspace>`. |
| `src/app/dashboard/page.module.css` | Rewrite for the new layout (see Layout). Remove the KPI, money-path, guide and top-band classes. |
| `src/app/dashboard/CampaignSwitch.tsx` | Replace the `<select>` with a sidebar list of `<Link href="/dashboard?campaign=N">` items. |
| `src/app/dashboard/DemoGuide.tsx` | Becomes the one-line stepper: done, current and upcoming states, sandbox-login Copy chip, CTA, coral progress line. Keep the per-campaign logic for non-featured recalls (F4). |
| `src/app/dashboard/Workspace.tsx` | Two-column grid. Left: Cases card + Activity card. Right: DetailPanel at full height. Stacks below 960px main width. Remove the separate `MessagePreview` section; it becomes the "Message" tab inside the panel. Status chips: All / Sent / Opened / Waiting / Settled / Problem. |
| `src/app/dashboard/CaseGrid.tsx` | Columns: Buyer · Path + paid (two-line cell) · Amount · Status. Fixed widths (see Table). Remove the Outbox "Action" link column; the panel CTA replaces it. Update the gridTheme params (below). |
| `src/app/dashboard/DetailPanel.tsx` | Header (avatar, name, "path · amount · status"), tabs with a sliding underline, scrolling body with a fade at the bottom, CTA pinned to the bottom. |
| `src/app/dashboard/StatusBadge.tsx` + `data.ts` | Split the current "Waiting" status into **Opened** (`openedAt` set, no money step yet) and **Waiting on PayPal** (`awaitingPayPal`). Rename "Notified" to **Sent**. Update `caseStatus()`, `CaseStatus`, the legend and the tests in `tests/dashboard.test.ts`. |
| **new** `src/app/dashboard/Activity.tsx` | Feed of recent events, newest first. Sources: verified PayPal webhooks (`webhook_events` table), buyer sign-ins, notices opened, notices sent, campaign approval. Add a loader in `src/lib/dashboard.ts`. |
| **new** `src/app/dashboard/LiveSettle.tsx` (client) | Wraps `AutoRefresh`. When a case changes from Waiting to Settled between refreshes, it flashes the row, shows the toast and tweens the money total. |
| `src/components/ProductArt.tsx` | Replace the `warmer` paths with the two-pebble drawing below. |
| `src/app/globals.css` | Add the keyframes `rrCharge`, `rrNudge`, `rrBlink`, `rrRing` (below). `art-rise`, `art-pulse` and `art-glow` already exist. |

## Layout (desktop)
- **Root:** CSS grid `clamp(216px,18vw,264px) minmax(0,1fr)`, min-width 760px, background `--ground` #fbf9f7.
- **Sidebar:**
  - `--brand` #3b1f3f, padding 26px 18px, flex column with 28px gap, `position: sticky; top: 0; height: 100vh; overflow-y: auto`.
  - Order: logo, store chip, CAMPAIGNS list, links (Test results with ✓ 51/51, GitHub), disclaimer pinned to the bottom (`margin-top: auto`).
- **Main:** `height: 100vh; display: flex; flex-direction: column; overflow-y: auto`.
  - Every section uses horizontal padding `max(24px, calc((100% - 1240px) / 2))`. Content stays at most 1240px wide and centered.
- **Demo stepper:** 60px tall, white, 1px bottom border `--line`.
  - Steps are 22px circles joined by 2px connectors (6–28px).
  - Current step: pill `--surface-sunk` #f2edef, padding 5px 12px 5px 5px, bold label, number ring pulse.
  - Coral 2px progress line on the bottom edge, width = (completed steps + 0.5) / 4.
  - Below 1040px main width: hide "Try the demo", the chip becomes "Copy login", the CTA becomes "Open page ↗".
- **Recall header:** padding-top 18px, flex-wrap, gaps 16px vertical / 18px horizontal.
  - 72px art tile (radius 14, `--surface-sunk`).
  - Title block `flex: 1 1 380px`:
    - CPSC pill: DM Mono 12px on `--recall-bg` / `--recall`, nowrap.
    - h1: Bricolage 700 24/1.15.
    - Meta line: 13px.
  - Progress card `flex: 1 1 360px; max-width: 520px`, radius 12, padding 10px 16px:
    - header: "Progress", Live dot, Replay, money in DM Mono 15px green `#14633a`
    - 4 bar segments (8px tall, 4px gap): plum for Found / Notified / Opened; green `#2f8a57` + amber `#e8a317` for Settled / Waiting
    - numbers: Bricolage 700 20px
- **Workspace row:** `flex: 1 1 0; min-height: 461px; display: grid; grid-template-rows: minmax(0,1fr); grid-template-columns: minmax(0,640px) minmax(300px,1fr); gap: 16px; padding: 16px 24px 16px` (horizontal padding uses the max() rule above).
  - Left column: flex column, gap 16, min-height 0. The Cases card keeps its natural height. The Activity card is `flex: 1 1 0` and is **only rendered when ≥ 96px is free** (measured with a ResizeObserver).
  - Right column: `position: relative`, with the panel absolutely filling it, so the panel always matches the left column's height.
  - **Stacked mode** (main width < 960px): one column, Activity fixed at 300px, panel fixed at 560px.

### Cases table
- **Column template** (header and rows): `minmax(140px,200px) minmax(120px,150px) 72px 150px`, gap 10px, row padding 0 18px 0 15px with a 3px left border (plum when selected).
- **Header row:** `--surface-sunk`, 12px/600, `--ink-muted`.
- **Rows:** min-height 50px, 1px top border #efe9ec. Hover #fbf7f9, selected #f8f2f5.
- **Buyer cell:** 28px initials avatar + name (600, nowrap). On the sandbox buyer, add a coral badge "You · sign in here" (11px/700, #ff9e7a on #2a1530) under the name.
- **Path cell:** path name on the first line, "200 days ago" in DM Mono 12px muted on the second.
- **Amount:** DM Mono 13.5px, right-aligned.
- **Status pills** (icon + word, radius 999, 12.5px/700):

| Status | Icon | Background | Text color |
| --- | --- | --- | --- |
| Sent | mail | #f2edef | #5a525c |
| Opened | eye/dot | #e6edf7 | #2d4a7a |
| Waiting on PayPal | pulsing 7px dot #c27c00 | #fdf0d5 | #7a4b00 |
| Settled | check | #ddf1e5 | #14633a |

- **Footer legend:** 12px muted.

### Activity card
- **Header:** "Activity" in Bricolage 15px, a muted subline, and a Live dot.
- **Rows:** grid `86px 14px 1fr auto`, padding 8px 18px. Time in DM Mono 12px, 8px colored dot, text 13.5px, amount in DM Mono (green when positive).
- **New events:** flash #dcf2e4, then fade back over 1.2s.
- **Scroller:** fades out over the bottom 28px with `mask-image`.

### Detail panel
- **Header:** padding 12px 16px.
- **Tabs:** 42px tall, labels 13.5px/700, 2px coral underline that slides (`left` / `width`, .3s cubic-bezier(.2,.8,.2,1)).
- **"Why this happened" timeline:**
  - 10px dots: MODEL #5b2a66, YOU #a89aa9, TOOL #ff9e7a, RULE #1f1a21.
  - Tag pill above each step, text 13.5/1.5.
  - The RULE step shows "Rule that applied: `CODE`" in DM Mono 11px.
  - Pending steps at 50% opacity.
- **CTA:** pinned at the bottom, 44px pill.
  - Sandbox buyer: "Open buyer page ↗", coral #ff9e7a on #2a1530.
  - Every other buyer: "Preview (fictional buyer) ↗", white with a `--line` border.

## Interactions and motion
All motion turns off under `prefers-reduced-motion` (the existing rule in globals.css covers it).
- **Load:** numbers and bars count up from 0 over 1300ms, easing `1-(1-k)^3`.
- **Live settle:**
  - **Trigger:** a case goes from Waiting on PayPal to Settled after an `AutoRefresh`.
  - Row background #dcf2e4, fading over 1s, for 1.5s.
  - Pill changes color over .4s.
  - Green bar grows over .8s.
  - Money total tweens over 900ms.
  - Sidebar count updates.
  - Toast appears bottom-right: #1f1a21, radius 12, "PayPal confirmed <name>'s refund · $X · just now". It fades and rises over .35s/.45s and auto-hides after about 4s.
  - Activity gets a new row at the top.
  - The mock fakes this with a timer; the real app should drive it from data.
- **Row select:** the timeline steps stagger in 70ms apart (opacity plus 6px translateY over .35s).
- **Hover:** CTAs lift 2px with a soft shadow. Sidebar items get a rgba(255,255,255,.06) background. The logo mark rotates 180deg (the existing `.logo-turn`).
- **Current demo step:** ring pulse, `rrRing` 1.8s.
- **Copy:** copies the sandbox email; the label shows "Copied ✓" for 1.6s.

```css
@keyframes rrCharge{0%,100%{opacity:.2}35%,70%{opacity:1}}
@keyframes rrNudge{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
@keyframes rrBlink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}
@keyframes rrRing{0%{box-shadow:0 0 0 0 rgba(59,31,63,.4)}100%{box-shadow:0 0 0 8px rgba(59,31,63,0)}}
```

### New warmer art (viewBox 0 0 96 96, stroke = currentColor, width 2.4)
```tsx
<ellipse className="art-fill art-glow" cx="48" cy="60" rx="38" ry="30" />
<g transform="rotate(-10 32 58)">
  <rect x="15" y="32" width="34" height="52" rx="17" fill="var(--surface)" />
  <rect x="21" y="40" width="22" height="36" rx="11" strokeWidth="1.4" strokeDasharray="2.5 3.5" stroke="var(--accent)" />
  <path d="M28 80.5h8" strokeWidth="2" />
</g>
<g className="art-nudge"><g transform="rotate(9 63 60)">
  <rect x="46" y="34" width="34" height="52" rx="17" fill="var(--surface)" />
  <circle cx="63" cy="49" r="4.5" strokeWidth="2" /><path d="M63 46.5v3" strokeWidth="1.8" />
  <circle className="art-fill art-led" cx="56" cy="66" r="2.3" />
  <circle className="art-fill art-led art-led2" cx="63" cy="66" r="2.3" />
  <circle className="art-fill art-led art-led3" cx="70" cy="66" r="2.3" />
  <path d="M59 82.5h8" strokeWidth="2" />
</g></g>
<path className="art-steam art-steam1" d="M38 26c-3.5-4 3.5-6 0-11" strokeWidth="2.2" />
<path className="art-steam art-steam2" d="M50 26c-3.5-4 3.5-6 0-11" strokeWidth="2.2" />
<path className="art-steam art-steam3" d="M62 26c-3.5-4 3.5-6 0-11" strokeWidth="2.2" />
```
`.art-led` uses `rrCharge 2.4s` with .35s and .7s delays. `.art-nudge` uses `rrNudge 3.2s`.

## State
- **Server** (`loadDashboard`):
  - header
  - cases, with the new status values
  - campaigns, for the sidebar, with settled/total counts and approval label
  - guide
  - **activity[]** `{ at, kind, text, amountCents? }`
- **Client (Workspace):** `selectedId` (defaults to the `canSignIn` buyer), `tab` ('why' | 'msg'), `stacked` and `activityFits` (ResizeObserver), search and status filter (keep the existing ones).
- **Client (LiveSettle):** previous statuses by case id, `flashId`, toast, tweened money.

## Design tokens
These match `globals.css`; no new colors except the status and bar colors below.
- **Palette:** ground #fbf9f7, surface #fff, surface-sunk #f2edef, ink #1f1a21, ink-muted #5a525c, line #e0d9dd, brand #3b1f3f, accent #ff9e7a, on-accent #2a1530, on-ground-muted #dccbdd, recall #9a4a12 on #fbe9da, model #5b2a66 on #f1e7f2, ok #14633a on #ddf1e5.
- **Added:** bar green #2f8a57, amber #e8a317, waiting #7a4b00 on #fdf0d5, opened #2d4a7a on #e6edf7, row divider #efe9ec, hover #fbf7f9, selected #f8f2f5, flash #dcf2e4, muted label #6f6670.
- **Type:**
  - Bricolage Grotesque 700: h1 24, card titles 15–17, numbers 20.
  - DM Sans: body 13–14.5, labels 12–13.5.
  - DM Mono: codes, amounts, times 11–15.
- **Radius:** cards 12, art tile 14, pills 999, code 4.
- **Spacing:** section gap 16, page gutter max(24px, centered 1240px), card padding 12–18.
- **Shadows:** toast 0 12px 32px rgba(31,26,33,.28); CTA hover 0 6px 16px rgba(255,158,122,.35).

## Placeholders to replace
- Sandbox email `sb-buyer@personal.example.com`: use the real sandbox login from the README / Devpost.
- Activity rows and times: mock data.

## Files
- `Dashboard.dc.html`: final design (open it in a browser with `support.js` in the same folder).
- `Dashboard Directions.dc.html`: the explored directions 1a/1b/1c/2a, for context only.

## Suggested Claude Code prompt
> Read design_handoff_dashboard/README.md and open Dashboard.dc.html in a browser. Implement the dashboard redesign in src/app/dashboard/ following the file-by-file plan. Keep AG Grid, CSS Modules and the existing data flow. Split the "Waiting" status into "Opened" and "Waiting on PayPal" and update tests/dashboard.test.ts. Add Activity.tsx backed by webhook_events. Run npm test and fix any failures.
