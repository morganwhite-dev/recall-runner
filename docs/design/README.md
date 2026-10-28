# Design

Recall Runner uses the plum design system. Read `PLUM-DESIGN.md` first: palette, fonts and the rules every page follows.

| Folder | What it holds | Status |
| --- | --- | --- |
| `PLUM-DESIGN.md` | Palette, type, tag and status rules | Current |
| `home/` | Home layouts. `split-APPROVED.html` is built | Done |
| `dashboard/` | Dashboard layouts, plus screenshots of the built page. `master-detail-APPROVED.html` is built | Done |
| `archive-old-look/` | The first, rejected design and its DESIGN-SPEC.md | Reference only |

Pages not designed yet: buyer page, Test results. For each, make three layouts, pick one, then build it.

To see any HTML file, open it in a browser. The `not-chosen` folders hold layouts that were considered and not picked.

## Redesign pass (Phase 6)

New design images go in the same folder as the page's markdown spec, not in a separate `screenshots/` folder. For each page being redone, use `<page>/` with `<PAGE>.md` (the spec: what to keep, tokens, components) and the images next to it, for example `buyer/BUYER.md`, `buyer/phone.png`, `buyer/laptop.png`. Name images by what they show (`phone`, `laptop`, `several-recalls`). The older `screenshots/` folders stay as they are.
