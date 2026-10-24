# Recall Runner: design spec

Mockups: `buyer.html` (4 phone states at 390 × 844) and `dashboard.html` (1440 desktop). Light mode first. One font (Inter), one icon style (2px stroke line icons, Heroicons/Lucide-compatible), no images except inline SVG line illustrations.

---

## 1. Design tokens

### 1.1 Colors

| Token                       | Hex                               | Use                                                                        |
| --------------------------- | --------------------------------- | -------------------------------------------------------------------------- |
| `ink`                       | `#111827`                         | Primary text                                                               |
| `ink-2`                     | `#4B5563`                         | Secondary text, labels, table headers                                      |
| `ink-3`                     | `#6B7280`                         | Placeholders, disclaimer, separators (never below 4.5:1 on its background) |
| `line`                      | `#E5E7EB`                         | Borders, row dividers                                                      |
| `line-2`                    | `#D1D5DB`                         | Input borders, header resize marks                                         |
| `line-soft`                 | `#F3F4F6`                         | Count chips, progress track, URL bar                                       |
| `bg`                        | `#FFFFFF`                         | Surfaces                                                                   |
| `bg-subtle`                 | `#F9FAFB`                         | Grid header, row hover, grid footer                                        |
| `canvas`                    | `#F3F4F6`                         | Dashboard page background                                                  |
| `product-bg`                | `#F5F3EF`                         | Warm stone panel behind product illustrations                              |
| `action`                    | `#0F172A`                         | Primary button ("Confirm with PayPal"), logo tile                          |
| `action-hover`              | `#1E293B`                         | Primary hover                                                              |
| `accent`                    | `#1D4ED8`                         | Links, selection, focus ring, "Notified", YOU                              |
| `accent-bg` / `accent-line` | `#EFF6FF` / `#BFDBFE`             | Selected row, remedy card, info pill                                       |
| `danger` / `-bg` / `-line`  | `#B91C1C` / `#FEF2F2` / `#FECACA` | Recall badge only                                                          |
| `warn` / `-bg` / `-line`    | `#92400E` / `#FFFBEB` / `#FDE68A` | "Waiting", account mismatch icon                                           |
| `ok` / `-bg` / `-line`      | `#15803D` / `#F0FDF4` / `#BBF7D0` | "Settled", "Approved", success                                             |
| `model` / `-bg` / `-line`   | `#6D28D9` / `#F5F3FF` / `#C4B5FD` | MODEL steps (AI)                                                           |
| `rule` / `-bg` / `-line`    | `#0F172A` / `#F8FAFC` / `#CBD5E1` | RULE steps (deterministic code)                                            |
| `heat` (illustration only)  | `#C2410C`                         | Heat lines in the hand warmer drawing                                      |

### 1.2 Contrast (WCAG 2.x relative luminance, computed)

| Text             | Background                         | Ratio  | Passes |
| ---------------- | ---------------------------------- | ------ | ------ |
| `ink` #111827    | white                              | 17.7:1 | AAA    |
| `ink` #111827    | `bg-subtle` #F9FAFB                | 17.0:1 | AAA    |
| `ink` #111827    | `product-bg` #F5F3EF               | 16.0:1 | AAA    |
| `ink` #111827    | `accent-bg` #EFF6FF (selected row) | 16.3:1 | AAA    |
| `ink` #111827    | `rule-bg` #F8FAFC                  | 17.0:1 | AAA    |
| `ink-2` #4B5563  | white                              | 7.6:1  | AAA    |
| `ink-2` #4B5563  | `bg-subtle` #F9FAFB                | 7.2:1  | AAA    |
| `ink-2` #4B5563  | `line-soft` #F3F4F6                | 6.9:1  | AA     |
| `ink-2` #4B5563  | `accent-bg` #EFF6FF                | 7.0:1  | AAA    |
| `ink-3` #6B7280  | white                              | 4.8:1  | AA     |
| `ink-3` #6B7280  | `bg-subtle` #F9FAFB                | 4.6:1  | AA     |
| white            | `action` #0F172A                   | 17.9:1 | AAA    |
| white            | `accent` #1D4ED8                   | 6.7:1  | AA     |
| white            | `ok` #15803D                       | 5.0:1  | AA     |
| `accent` #1D4ED8 | white (links, Next)                | 6.7:1  | AA     |
| `accent` #1D4ED8 | `accent-bg` #EFF6FF                | 6.2:1  | AA     |
| `danger` #B91C1C | `danger-bg` #FEF2F2                | 5.9:1  | AA     |
| `warn` #92400E   | `warn-bg` #FFFBEB                  | 8.2:1  | AAA    |
| `ok` #15803D     | `ok-bg` #F0FDF4                    | 4.8:1  | AA     |
| `model` #6D28D9  | `model-bg` #F5F3FF                 | 6.5:1  | AA     |
| white            | `rule` #0F172A                     | 17.9:1 | AAA    |

Rules: `ink-3` is only for 13px+ secondary text on white or `bg-subtle`. Disabled controls (Back on 1 of N) use opacity and are exempt, but also carry `aria-disabled`. Status is never color-only: every pill and step has an icon and a word.

### 1.3 Type scale (Inter, `font-variant-numeric: tabular-nums` on numbers)

| Role                   | Mobile (buyer)            | Desktop (dashboard)      | Weight    | Tailwind                                                      |
| ---------------------- | ------------------------- | ------------------------ | --------- | ------------------------------------------------------------- |
| Headline               | 24/30                     | 20/28                    | 700 / 600 | `text-2xl leading-[30px] font-bold` / `text-xl font-semibold` |
| KPI value              | n/a                       | 28/36                    | 700       | `text-[28px] leading-9 font-bold`                             |
| Lead                   | 17/26                     | n/a                      | 400       | `text-[17px] leading-[26px]`                                  |
| Body                   | 16/24 (minimum on mobile) | 14/20                    | 400       | `text-base` / `text-sm`                                       |
| Card title             | 16/22                     | 15/20                    | 600       | `text-base font-semibold`                                     |
| Secondary              | 14/20                     | 13/20                    | 400–500   | `text-sm` / `text-[13px]`                                     |
| Section label          | 13/18 uppercase, +0.04em  | 12/16 uppercase, +0.05em | 600       | `text-[13px] uppercase tracking-wide font-semibold`           |
| Actor tag              | n/a                       | 11/22 uppercase, +0.06em | 700       | `text-[11px] font-bold tracking-wider`                        |
| Mono (IDs, rule codes) | 15                        | 12.5                     | 600       | `font-mono`                                                   |

### 1.4 Spacing, radius, elevation

- 4px grid. Used steps: 4, 8, 12, 16, 20, 24 (Tailwind `1, 2, 3, 4, 5, 6`). Page gutter: 16 mobile, 24 desktop. Card gap: 16.
- Radius: 6 (`sm`, chips), 8 (`md`, inputs, grid), 12 (`lg`, desktop cards and mobile buttons), 14 (mobile cards), pill 999.
- Heights: mobile button 52, mobile tap targets min 44, desktop controls 36–40, grid header 40, grid row 44, top bar 60.
- Elevation: cards are flat (1px `line` border). Only the mobile action bar has a soft upward shadow: `0 -8px 16px -12px rgba(15,23,42,.18)`.

---

## 2. Components and states

| Component                     | States                                                                                                                                                        | Notes                                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Primary button** (`action`) | default, hover `action-hover`, focus (2px `accent` ring, 2px offset), pressed (scale .98), loading (spinner + "Opening PayPal…"), disabled (40% opacity)      | "Confirm with PayPal" is a neutral dark button with the word PayPal. Swap in PayPal's official button asset later in the same 52px slot. |
| **Secondary button**          | default (white, `line-2` border), hover `bg-subtle`, focus ring, disabled                                                                                     | "Contact Brightnest Home". In state C, "Try another PayPal account" is the primary and Contact is secondary.                             |
| **Recall badge**              | single state                                                                                                                                                  | `danger` text + alert icon + "Recalled · CPSC #…". The only red element on the buyer page.                                               |
| **Product hero**              | default, missing image (generic box icon on `product-bg`)                                                                                                     | 140px tall, warm panel, store chip top-left.                                                                                             |
| **Remedy card (single)**      | default; loading skeleton                                                                                                                                     | Icon tile + title + one-line method + amount on the right. Not a radio: one remedy is shown as a fact, not a choice.                     |
| **Remedy options (2–3)**      | unselected, hover, selected, focus, disabled ("Not available for this order")                                                                                 | See §3.                                                                                                                                  |
| **Pinned action bar**         | single action + hint; two actions (error); action + hint + pager (multi-recall)                                                                               | `position: sticky; bottom: 0` with `padding-bottom: env(safe-area-inset-bottom)`.                                                        |
| **Pager (Back / Next)**       | Back disabled on 1 of N; Next becomes "Summary" on N of N                                                                                                     | 44px tall text buttons in `accent`, dots in the middle.                                                                                  |
| **Result header**             | success (`ok`, check), mismatch (`warn`, user-x), failure (`danger`, alert; "Nothing was paid")                                                               | 56px icon circle + headline + lead.                                                                                                      |
| **Receipt card**              | default, copied ("Copied" for 2s on the copy button)                                                                                                          | Rows 48px min. Reference in mono with a 44px copy button.                                                                                |
| **Status pill**               | Notified (`accent`, mail), Settled (`ok`, check), Waiting (`warn`, clock), Failed (`danger`, alert), Skipped (`ink-2`, dash)                                  | Icon + word always.                                                                                                                      |
| **KPI card**                  | default, loading (skeleton bar for value), zero ("0")                                                                                                         | 4 equal columns, fixed 96px height.                                                                                                      |
| **Campaign switcher**         | closed, open (listbox), focus                                                                                                                                 | Shows campaign name + CPSC number.                                                                                                       |
| **Approval pill**             | Approved (`ok`), Needs approval (`warn`; a "Review and approve" primary button replaces the pill)                                                             |                                                                                                                                          |
| **Cases grid**                | row default, hover `bg-subtle`, selected `accent-bg` + 3px `accent` left bar, focus cell ring, loading overlay, empty ("No buyers found for this recall yet") | Autoheight: never render empty rows.                                                                                                     |
| **Rules strip**               | active rule (white, solid border, case count), inactive (dashed, `bg-subtle`, "Not in this recall")                                                           | Repeats the RULE tag so the legend is learned before the timeline.                                                                       |
| **Actor tag**                 | MODEL, RULE, TOOL, YOU                                                                                                                                        | See §4.                                                                                                                                  |
| **Timeline step**             | default; error (TOOL step with `danger` pill and message)                                                                                                     | Node + tag + text; MODEL and RULE text sit in boxes.                                                                                     |
| **Decoy note**                | single                                                                                                                                                        | Dashed neutral box with a MODEL tag: "Not matched".                                                                                      |
| **Disclaimer**                | single                                                                                                                                                        | Once per screen: last item of the buyer page content (scrolls into view above the action bar), page footer on the dashboard.             |

---

## 3. Remedy layouts (1, 2 or 3 options)

**1 option (main case, shown in mockups).** One full-width card, no radio. The amount (or "Free") sits on the right. The primary button is active immediately.

**2 or 3 options.** Equal-width option cards side by side in a `role="radiogroup"`, `grid-cols-2` or `grid-cols-3`, gap 8px, every card the same fixed height (104px) with content stacked and centered. Nothing is pre-selected. The primary button is disabled and reads "Choose a remedy" until one is picked, then reads "Confirm with PayPal".

```
 2 options (175px each)                    3 options (114px each)
+------------------+ +------------------+  +------------+ +------------+ +------------+
|  [refund icon]   | |   [box icon]     |  |  [refund]  | |   [box]    | |  [wrench]  |
|     Refund       | |   Replacement    |  |   Refund   | |  Replace-  | | Repair kit |
|     $34.00       | |  Tracking added  |  |   $34.00   | |    ment    | |    Free    |
+------------------+ +------------------+  +------------+ +------------+ +------------+
```

- Card: `rounded-[14px] border border-line bg-white p-3 flex flex-col items-center justify-center gap-1 text-center min-h-[104px]`.
- Selected: `border-2 border-accent bg-accent-bg` plus a 20px check circle in the top-right corner (so selection is not color-only).
- Labels: 16px semibold title, 14px `ink-2` value. With 3 options, titles may wrap to 2 lines; keep titles to one or two words.
- Each card is a native `<input type="radio">` wrapped in a `<label>` (the whole card is the tap target, well above 44px).

---

## 4. MODEL vs RULE (dashboard timeline)

The distinction is carried by four channels (color, border style, node shape, container), so it reads on a small video frame and in grayscale.

| Actor | Tag                                                          | Node                  | Text container                                    | Meaning                                                                  |
| ----- | ------------------------------------------------------------ | --------------------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| MODEL | violet text, violet-50 fill, **dashed** border, sparkle icon | dashed violet circle  | dashed violet box                                 | AI reads and explains. Shows evidence and confidence. Never moves money. |
| RULE  | **solid dark** slate fill, white text, scale icon            | solid dark **square** | slate box with 3px dark left bar + mono rule code | Fixed code decides money. Shows the rule ID.                             |
| TOOL  | white, gray border, `</>` icon                               | gray outlined circle  | plain text                                        | A PayPal or CPSC API call and its result.                                |
| YOU   | blue, user icon                                              | solid blue circle     | plain text                                        | The merchant's decision.                                                 |

Dashed and round reads as "suggestion"; solid and square reads as "fixed". The legend above the timeline says this in a few words per actor.

---

## 5. Multi-recall flow (one buyer, N recalls)

Example: Alicia Rivera bought the HotHands hand warmers (CPSC #27011, refund only, $34.00, 45 days ago) and the Aitjunz 8-Drawer Dresser (CPSC #26794, repair only: free retrofit kit with counterweight blocks, $249.00, 70 days ago). Phone D shows notice 1 of 2.

1. **Notice 1 of N.** A "Recall 1 of N" label with N equal segments sits under the URL bar (fixed, does not scroll). One product per screen, same layout as the single notice. Order: oldest order first (the dresser at 70 days, then the hand warmers at 45 days).
2. **Pinned bar.** Primary "Confirm with PayPal" for the current product only, the hint line, then a hairline and a 44px pager row: Back (left), dots (center), Next (right). Back and Next are text buttons, so they never compete with the primary button.
3. **Confirm.** Settles only this product. The result replaces the notice body in place (state B for a refund, or "Kit requested" with "No payment" for a repair), that product's segment gets a check, and the primary button becomes "Next recall". A mismatch shows state C; nothing is paid for any product.
4. **Next without confirming** is allowed. That product is marked "Not claimed yet" and can be reached again with Back or from the summary.
5. **Notice N of N.** Next is relabeled "Summary".
6. **Summary screen.** Headline "Your recalls", then one equal-height row per product (56px thumbnail, product name, outcome pill, reference line):
   - Aitjunz 8-Drawer Dresser: "Kit requested" (`ok`, wrench icon), "No payment".
   - HotHands Rechargeable Hand Warmers, 2-pack: "Refund sent" (`ok`, check icon), "$34.00 · PayPal refund 8EG04191BL774610V".
   - Any skipped product: "Not claimed yet" (`ink-2`, dash icon) with a 44px "Claim" text button.

   Pinned bar: secondary "Contact Brightnest Home". Disclaimer once at the end.

Each product keeps its own case row in the dashboard; the multi-recall view only groups cases by buyer on the buyer side.

---

## 6. Implementation notes (Next.js, about 10 hours)

**Setup (0.5 h)**

- App Router. Routes: `app/r/[token]/page.tsx` (buyer), `app/r/[token]/summary/page.tsx` (multi-recall), `app/dashboard/page.tsx`.
- `next/font/google` Inter (400, 500, 600, 700) as `--font-sans`.
- Put every token from §1 into `app/globals.css` as CSS variables and use them from plain CSS (CSS Modules). The project does not use Tailwind; ignore the Tailwind column in the type table. AG Grid uses the same hex values (below).

**Buyer page (3.5 h)**

- Layout: `min-h-dvh flex flex-col`; content `flex-1 px-4`; action bar `sticky bottom-0 border-t bg-white px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]`.
- Components: `ProductHero`, `RecallBadge`, `RemedyCard` / `RemedyOptions`, `ActionBar`, `ResultHeader`, `ReceiptCard`, `RecallStepper`, `Pager`, `Disclaimer`.
- Illustrations: inline SVG React components (`HandWarmerArt`, `DresserArt`, `BatteryPackArt`) copied from the `<symbol>` blocks in `buyer.html`, `stroke="#374151" strokeWidth={2.5}`, `aria-hidden`, with `role="img"` and a text label on the wrapper.
- The URL bar, status bar and phone frame in the mockup are presentation only; do not build them.

**Dashboard (4 h)**

- CSS grid: `grid grid-cols-[1fr_472px] gap-6 p-6 items-start`; detail panel `sticky top-6`.
- `Timeline` takes `steps: { actor: 'MODEL'|'RULE'|'TOOL'|'YOU'; text: string; evidence?: string; confidence?: number; ruleCode?: string }[]` and picks node, tag and box styles from `actor`.
- KPI cards and the rules strip are plain `grid-cols-4` cards; no chart library (the progress bar is a div).

**AG Grid Community theme (1.5 h)** (v33+ Theming API; confirm parameter names with TypeScript autocomplete)

```ts
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
} from "ag-grid-community";
ModuleRegistry.registerModules([AllCommunityModule]);

export const recallGridTheme = themeQuartz.withParams({
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  headerFontSize: 13,
  headerFontWeight: 600,
  foregroundColor: "#111827",
  backgroundColor: "#FFFFFF",
  accentColor: "#1D4ED8",
  borderColor: "#E5E7EB",
  headerBackgroundColor: "#F9FAFB",
  headerTextColor: "#4B5563",
  rowHoverColor: "#F9FAFB",
  selectedRowBackgroundColor: "#EFF6FF",
  rowHeight: 44,
  headerHeight: 40,
  spacing: 8, // 16px cell padding
  wrapperBorderRadius: 12,
  columnBorder: false,
  rowBorder: { color: "#E5E7EB" },
});
```

- Grid props: `theme={recallGridTheme}`, `domLayout="autoHeight"` (no empty rows), `rowSelection={{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }}`, `getRowId={p => p.data.caseId}`, `onSelectionChanged` drives the detail panel. Select Morgan Demo on load for the demo.
- Columns (`flex` values match the mockup): Buyer 1.35 (initials + name renderer), Ordered 1 (header `Ordered *`, default sort ascending by days), Item 1.9 (`tooltipField`, ellipsis), Amount 0.8 (`type: 'rightAligned'`, USD `valueFormatter`), Path 1.15 (icon + text renderer), Status 1 (`StatusPill` renderer).
- Selected-row left bar (not a theme parameter): `.ag-row-selected::before { content:''; position:absolute; inset:0 auto 0 0; width:3px; background:#1D4ED8; }`.
- The footer ("* Simulated order dates" and "1 to 6 of 6") is a plain div under the grid; skip AG Grid pagination at 6 rows.

**Accessibility checklist**: 16px minimum body text on mobile; 44px minimum targets; every status has icon + text; visible focus ring `outline-2 outline-offset-2 outline-[#1D4ED8]`; `aria-live="polite"` on the result header so screen readers announce "Refund sent"; `prefers-reduced-motion` disables the only animation (button press scale).

**Video tips**: record the buyer page in a 390px device frame at 2× zoom; on the dashboard, click Morgan Demo, then pause on the RULE step so the dark square and the rule code are on screen together.

## Decision (Oct 23): the buyer page is one responsive full webpage

Decided by the owner. One page, two layouts, same content and order:

- **Wide screens (1024px and up), the default for judges on laptops:** full page as in `buyer-desktop-full.html`. Store header bar across the top. Content max width 1120px, centered. Two columns: left is the product panel (240px tall), recall badge, 32px headline, order line, hazard, and the "stop using" note; right is a 400px remedy panel with the remedy card, "Confirm with PayPal", the sign-in hint and the three numbered steps. Below: three equal info cards (About this recall, Your order, Questions). Disclaimer once, in the footer.
- **Phones (under 768px):** single column, in the same order, matching `buyer.html` phone A. The action ("Confirm with PayPal" plus hint) is pinned to the bottom in thumb reach. The three info cards stack below the content.
- **In between (768 to 1023px):** single column, centered, max width 640px, action not pinned.
- Multi-recall flow ("Recall 1 of N", Back / Next) and the success and mismatch states use the same responsive rules.
- `buyer-desktop.html` (the centered card version) is kept only for reference; it was not chosen.

## Fixes applied at approval (Oct 23)

Approved by the owner with these fixes:

1. **No Tailwind.** The project has no Tailwind; build with CSS variables in `app/globals.css` and CSS Modules. The "Tailwind" column in the type table is reference only.
2. **Real address.** Mockups show `recall-runner.onrender.com/r/…`, the address judges will see.
3. **No Item column** in the cases table. A campaign covers one recalled product, already shown in the recall header, so repeating it on every row added nothing.
4. **AG Grid theme setting names** beyond the ones the designer confirmed (`accentColor`, `backgroundColor`, `foregroundColor`, `borderColor`, `headerTextColor`, `spacing`, `columnBorder`) must be checked against the installed AG Grid version when the dashboard is built.

---

## 7. Home, test results and Outbox (Oct 23, draft for approval)

Mockups: `home.html` (`/`), `evals.html` (`/evals`), `outbox.html` (`/dashboard`, Outbox tab). All three use the tokens, tags, pills and illustration above with no new colors. Each mockup sits in a 1440px browser frame that is presentation only. One disclaimer per screen, in the footer, same wording as the dashboard. Footer text sits on `canvas` on the evals and dashboard pages, so it uses `ink-2` there (`ink-3` is only for white).

### 7.1 Shared app header (home and evals)

- 60px white bar, content aligned to the same 1120px column as the page. Left: logo tile (`action`, check-loop icon) + "Recall Runner" (same as the dashboard). Right: text links Dashboard, Test results, GitHub (external icon). Links are 36px tall, `ink-2`, hover `bg-subtle`; the current page has `aria-current="page"`, `ink`, 600 weight, `line-soft` fill.
- The dashboard keeps its own top bar (merchant, campaign switcher, approval pill).
- Routes: `app/page.tsx`, `app/evals/page.tsx`. Components: `AppHeader`, `Disclaimer` (shared).

### 7.2 Home (`/`)

Every row uses one 4-column grid (1120px, 16px gaps, columns of 268px), so card edges line up from the hero down.

1. **Hero** (columns 1–2 text, columns 3–4 preview). Eyebrow "PayPal hackathon demo", 40/46 bold headline, 17/26 `ink-2` subhead (two lines at 560px), then the primary "Start fresh demo" (48px, arrow icon) with the 13px note beside it: "Creates a demo store with real recalls and sandbox PayPal orders. About 20 seconds." Loading state: spinner + "Creating demo store…", button disabled, then redirect to `/dashboard`.
2. **Demo preview** (no empty art panel). A compact slice of the real dashboard: thumbnail with the hand-warmer drawing, campaign name, CPSC #27011 chip, Approved pill; a 3-cell KPI row (Buyers affected 6, Notified 6, Settled 3); one RULE timeline step (Morgan Demo, `REFUND_WINDOW_EXCEEDED`). It is a static figure with `aria-label`, not interactive.
3. **Evidence row**. Two equal stat cards (columns 1 and 2): "6%" Press release only, "~50%" Notified directly (the second has a 1.5px `ink` border to mark the stronger number). Columns 3–4: the exact sentence and its source on `bg-subtle`. No other statistics.
4. **How it works**. 4 equal 104px cards joined by a 16px `line-2` connector in the gaps. Each card: filled step number, actor tag (MODEL, YOU, TOOL, RULE, the same legend as the timeline), title, one-word actor line.
5. **What PayPal does here**. 6 equal 84px cards, icon tile + title + one line: Order records, Log In with PayPal, Refunds, Payouts, Shipment tracking, Webhooks.
6. **For judges**. `bg-subtle` box: title + "About 2 minutes" on the left, "Sandbox login is in the README." on the right, then 5 equal numbered step tiles joined by connectors. No credentials on the page.

**Phone (under 768px):** single column, 16px gutter. Order: headline, subhead, "Start fresh demo" full width (52px), note under it, demo preview, the two stat cards side by side (2 columns) with the sentence below, the 4 steps stacked (connectors become vertical, 12px tall, left-aligned under the numbers), PayPal cards in 2 columns, judge steps stacked, footer. Header links collapse to the brand plus a "Menu" button (sheet with the three links). **768–1023px:** hero stacks (text then preview), steps and PayPal cards in 2 columns.

### 7.3 Test results (`/evals`)

- Page title "Test results" with a one-line explanation on the right.
- **Summary strip**: 3 equal 96px cards (KPI style). "Money rules" (RULE tag) 11/11 + "Passing" pill + full bar; "AI tests" (MODEL tag) "Not run yet" + neutral "Phase 3" pill; "Last run" Oct 23, 2026.
- **Money rules** (real): white panel, RULE tag, "Run Oct 23, 2026" and "11 of 11 passing" on the right. Table columns: # (mono), Test (exact test names), Area (icon + Refund, PayPal Payout, Replacement, Repair, Guard), Result ("Passed", `ok` pill). 40px rows.
- **AI matching and safety** (planned): the panel border is dashed `model-line` so it reads as "not real yet" even in grayscale. MODEL tag, "Not run yet" pill on the right, then the banner "Example layout. Results appear after the AI tests are built (Phase 3)." (dashed neutral box with an info icon, `role="note"`). Same table; 8 planned cases, Area (Matching, Refusal, Prompt injection, Quoting, Fallback), Status "Not run yet" (neutral pill: `ink-2` text, `bg-subtle`, `line-2` border, dash icon). No pass or fail numbers anywhere for this section. When tests exist, the banner and dashed border go away and the pills switch to Passed / Failed.
- Data: render from the test runner's JSON output, not hand-written numbers.

**Phone:** single column. Summary cards stack (full width, 80px). Tables become lists: each row is a card with the number and test name on top and Area + status pill below; the header row is hidden. The banner stays above the AI list.

### 7.4 Outbox view (`/dashboard`, Outbox tab)

- Same top bar, recall header and KPI strip as `dashboard.html`. The grid toolbar is replaced by **two equal tabs** (`role="tablist"`, 48px): "Cases 6" and "Outbox 6". Selected tab: `ink`, 2px `accent` underline, count chip in `accent` / `accent-bg`; unselected: `ink-2`. The tab can be kept in the URL (`/dashboard?view=outbox`) so a judge link opens it directly.
- **Outbox table** (same grid styles; same 6 buyers in the same order): Buyer, Sent to (masked, `ink-2`), Sent, Opened (Yes / No as words), Status (the same Settled / Waiting / Notified pills), and an "Open buyer page" link button (30px, white, `line-2` border, external icon; column 184px). It opens `/r/{token}` in a new tab. Selected row: Alicia Rivera.
- Footer: "Delivery: in-app outbox (demo). Real email is not sent." (once) and "1 to 6 of 6".
- **Right panel** = message preview instead of case detail: "Message" eyebrow, buyer name + status pill, a 2×2 facts grid (To, Sent, Opened, Remedy), the subject, then the message on `bg-subtle`: greeting, what was recalled and that it should not be used, the CPSC hazard quoted in a dashed violet quote block, the remedy (full refund, $34.00), the buyer link `recall-runner.onrender.com/r/7f3a91c2`, and the store name. Below: the MODEL note "Drafted by the AI from the CPSC record; hazard and remedy quoted word for word", then a full-width primary "Open buyer page".
- The rules strip stays below the table, as on the Cases tab.

**Phone:** single column. Tabs stay as two equal halves at the top of the list. Each outbox row becomes a card: name + status pill, masked email and "Sent 2 min ago · Opened Yes", then a full-width 44px "Open buyer page" button. Tapping a card opens the message preview as a full-screen sheet with "Open buyer page" pinned at the bottom.
