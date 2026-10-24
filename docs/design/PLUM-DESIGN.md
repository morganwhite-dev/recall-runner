# Recall Runner: plum design (approved Oct 23, 2026)

Approved Home layout: `home/split-APPROVED.html` (open it in a browser). Built in `src/app/page.tsx`.
Approved dashboard layout: `dashboard/master-detail-APPROVED.html`. Built in `src/app/dashboard/` with two changes: a Test results link in the top bar, and the message preview moved under the grid.
The layouts in the `not-chosen` folders are kept only for reference.
`archive-old-look/` is the earlier, rejected look. Its DESIGN-SPEC.md still has useful content notes for the buyer page and Test results page, but ignore its colors and styling.

The colors live in code as CSS variables in `src/app/globals.css`.

## Palette (CSS variable names are the same everywhere)
ground #fbf9f7, surface #ffffff, surface-sunk #f2edef, ink #1f1a21, ink-muted #5a525c, line #e0d9dd,
brand (plum) #3b1f3f, on-brand #ffffff, accent (coral) #ff9e7a, on-accent #2a1530,
on-ground #ffffff, on-ground-muted #dccbdd, recall #9a4a12 on recall-bg #fbe9da,
rule-bg #1f1a21 / rule-ink #ffffff, model-bg #f1e7f2 / model-ink #5b2a66, ok-bg #ddf1e5 / ok-ink #14633a.

## Type
Bricolage Grotesque (headings), DM Sans (body), DM Mono (tags and codes).

## Rules for every page
- Few boxes: use alignment, hairlines and numbering. At most two boxed surfaces per page.
- Corners on boxed surfaces about 10 to 12px.
- MODEL = tinted tag, dashed outline, sparkle icon. RULE = solid dark tag, scale icon. TOOL = outline tag, code icon. YOU = quiet tag, person icon.
- Status is always an icon plus a word (Approved, Settled, Waiting). Never color alone.
- Coral is only a short highlight bar, never text on a light background. Clay (recall) only for the CPSC badge.
- Sentence case. One disclaimer per screen: "Demo store. The merchant and order dates are made up; the recalls are real CPSC data. Not affiliated with CPSC or PayPal."
