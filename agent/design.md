# design.md — ExzaEstate Design System (Meridian)

Source of truth for UI/UX, **frontend tasks only** (precedence in `AGENTS.md`). Any AI building UI must follow it exactly: no new colors, fonts, radii, shadows, spacing, motion or component styles. If a pattern is missing, reuse an existing one, then extend the system here first. Applies **identically** to Desktop (Tauri) and Web (Vite SPA); the only differences are window chrome (§5.1) and responsive behaviour (§9). All contrast numbers below were recomputed (rev. 2, 2026-10-03) against WCAG 2.2 for text over `--surface`, `--bg` and `--surface-sunken`, and are enforced by the token contrast test and the `axe` test in CI (§15).

## 0. Quick reference for AI agents (read first)

| Need                 | Use                                                                                            | Never                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Colour               | Token utilities: `bg-surface`, `text-muted`, `border-border`, `text-danger`                    | Raw hex, `rgb()`, `bg-[...]`, Tailwind palette colours (`bg-gray-100`) |
| Spacing              | Steps allowed in §4 (`p-4`, `gap-6`, `space-y-6`)                                              | `p-7`, `p-9`, `mt-[13px]`                                              |
| Radius               | `rounded-button`, `rounded-card`, `rounded-modal`, `rounded-full`                              | `rounded-sm/md/lg/xl`                                                  |
| Text size            | `text-display`, `text-h1…h6`, `text-body`, `text-small`, `text-caption`, `text-th`, `text-btn` | `text-xs/sm/lg/xl`, `text-[12px]`                                      |
| Status               | `<StatusBadge domain="…" value="…" />` (§2.5)                                                  | A hand-coloured `<span>`                                               |
| Money / area / dates | `<Money>`, `formatBDT()`, `formatArea()`, `formatDate()` (§3.1)                                | `toLocaleString()` inline, float maths                                 |
| Icons                | Lucide, 16/18/20 px, stroke 1.75                                                               | Emoji, other icon sets                                                 |
| Motion               | §8 only                                                                                        | Any other animation                                                    |
| Component            | The catalogue in §6.1                                                                          | Re-creating something that already exists                              |
| Pattern missing      | Extend this file first (§15), then build                                                       | Inventing a one-off style                                              |

Every screen ships with all its states: loading, empty, filtered-empty, error, offline, no-permission (§6.2). Light **and** dark must pass contrast.

## 1. Identity and what makes it memorable

ExzaEstate is a business ERP for land and property: people spend hours in it counting money, tracking plots and chasing installments. Meridian is built on three principles every professional tool needs:

- **Clarity** — every element earns its place; nothing decorative, nothing ambiguous.
- **Precision** — financial data demands exactness in alignment, typography, and number rendering.
- **Trust** — a premium, restrained aesthetic signals reliability and institutional quality.

The interface is calm, spacious and precise everywhere, and spends its boldness in **four signature components** (§7.1). Everything else stays quiet so those four are what people remember. Palette identity: **Exza Saffron Orange (`--primary: #F26522`) + Obsidian Charcoal (`--secondary: #17160F`)** — high-contrast, prestigious corporate real estate & ERP aesthetics: neutrals are obsidian and cool slate, while saffron orange is the signature brand accent for primary CTAs, active highlights, and milestone indicators.

Principles: (1) every screen answers where am I / what is this / what matters / what next / what needs attention; (2) status is never colour alone (§2.5); (3) money is always exact, never animated; (4) spacious but never wasteful; (5) keyboard first.

## 2. Central Theme File & Color System (`theme.css`)

All design tokens are defined in **one single central file: `packages/ui/src/styles/theme.css`** using Tailwind CSS v4's native `@theme` directive.

> [!IMPORTANT] > **Clean Utility Classes Rule (NO Arbitrary Square Brackets):**
> Components must **NEVER** use ugly arbitrary classes like `bg-[var(--primary)]` or `text-[#1A1A2E]`.
> All tokens generate first-class, native Tailwind v4 utility classes:
>
> - Use `bg-primary`, `bg-primary-deep`, `bg-secondary`, `bg-surface`, `bg-surface-sunken`, `bg-bg`
> - Use `text-primary`, `text-secondary`, `text-accent-text`, `text-muted`
> - Use `rounded-button`, `rounded-card`, `rounded-modal`
> - Use `text-h1`, `text-h2`, `text-h3`, `text-h4`, `text-h5`, `text-h6`
>   Changing a value in `packages/ui/src/styles/theme.css` instantly updates that font, color, or radius across the entire multi-app codebase.

### 2.1 Brand and surfaces (light — default)

| Token                | Hex       | Use                                                                            |
| -------------------- | --------- | ------------------------------------------------------------------------------ |
| `--primary`          | `#F26522` | Primary brand, primary CTA buttons, active state highlights, auth brand accent |
| `--primary-deep`     | `#D94D0C` | Primary button pressed/active depth, deep brand tone                           |
| `--primary-light`    | `#F5834B` | Primary button hover, light brand highlight                                    |
| `--secondary`        | `#17160F` | Secondary brand surface, obsidian sidebar, header chrome, dark modal backdrop  |
| `--secondary-light`  | `#222117` | Elevated obsidian dark surface, secondary dark hover                           |
| `--secondary-deep`   | `#0E0D09` | Ultra-deep obsidian inset zones                                                |
| `--accent`           | `#F26522` | Active-nav indicator, milestone dot, brand ribbons and badges                  |
| `--accent-text`      | `#C44309` | Accent when it is text or a small icon (4.8:1 on surface, passes WCAG AA)      |
| `--accent-subtle`    | `#FDEADE` | Accent tint for backgrounds, light brand highlight wash                        |
| `--bg`               | `#F5F5F7` | App background (cool light grey; Apple-inspired)                               |
| `--surface`          | `#FFFFFF` | Cards, tables, forms                                                           |
| `--surface-elevated` | `#FFFFFF` | Modal, popover, dropdown, command palette                                      |
| `--surface-sunken`   | `#EBEBF0` | Inset areas, secondary background zones                                        |
| `--surface-dark`     | `#17160F` | Obsidian sidebar, header, dark cockpit sections                                |
| `--primary-fg`       | `#F26522` | Primary brand colour used as icon, outline or chart series                     |
| `--action`           | `#F26522` | Fill of primary interactive buttons (dark mode: `#F26522`)                     |
| `--on-action`        | `#FFFFFF` | Text/icon on `--action`                                                        |
| `--focus`            | `#F26522` | Focus ring colour                                                              |

### 2.2 Text

| Token             | Hex       | On surface / bg / sunken | Use                                                                      |
| ----------------- | --------- | ------------------------ | ------------------------------------------------------------------------ |
| `--text`          | `#1D1D1F` | 16.8 / 15.5 / 14.2       | Titles, figures, primary content                                         |
| `--text-2`        | `#424245` | 10.0 / 9.2 / 8.4         | Descriptions, secondary                                                  |
| `--text-muted`    | `#68686D` | 5.5 / 5.1 / 4.7          | Helper text, timestamps, labels (was `#6E6E73`: failed on sunken at 4.3) |
| `--text-disabled` | `#AEAEB2` | 2.2 / 2.0 / 1.9          | Disabled controls only (WCAG-exempt); never for information              |

### 2.3 Borders

`--border` `#E5E5EA` (separators, card edges — decorative) · `--border-subtle` `rgba(0,0,0,0.04)` · `--border-strong` `rgba(0,0,0,0.12)` · **`--border-input` `#86868B`** (input/checkbox/select outlines; 3.6:1 on surface, 3.3:1 on bg, 3.1:1 on sunken — the previous `#8E8E93` fell below 3:1 on bg and sunken, WCAG 1.4.11). Borders stay thin and quiet.

### 2.4 Semantic colors (light) — text colour on the 12 % tint of itself

Tints are written `bg-success/12` (Tailwind opacity modifier on the token) — never a separate hex. Contrast is given over `--surface` / over `--bg`; all pass ≥ 4.5:1. The solid colour is also used for icons, outlines and (with white text) destructive fills.

| Token                      | Hex       | Contrast on tint (surface / bg) | Meaning                                                        |
| -------------------------- | --------- | ------------------------------- | -------------------------------------------------------------- |
| `--success`                | `#197444` | 4.9 / 4.5                       | Paid, active, approved, completed, available                   |
| `--warning`                | `#7C6200` | 4.9 / 4.5                       | Pending, partial, awaiting action                              |
| `--danger`                 | `#B83429` | 4.9 / 4.5                       | Overdue, failed, rejected, bounced, destructive                |
| `--info`                   | `#2563B1` | 5.1 / 4.7                       | Informational, due today, processing                           |
| `--special`                | `#7A39E8` | 4.9 / 4.5                       | Exception/advanced workflow: booked-not-paid, reversed, waived |
| `--void`                   | `#5F6572` | 5.0 / 4.6                       | Cancelled, expired, closed, inactive-by-decision               |
| `--primary-fg` (as status) | `#1A1A2E` | 13.4 / 12.4                     | Final/complete: Sold, Customer, Locked                         |

### 2.5 Status system — one word, one colour, everywhere

**Rule:** colour follows _meaning_, not the table. The word "Cancelled" is `--void` on every screen (property, booking, installment, payment, PO…); "Overdue", "Rejected", "Bounced", "Failed" are `--danger`; "Pending", "Partially Paid" are `--warning`. This replaces per-domain inconsistency. Every status renders as **icon + text + tint** (`● Paid`), and the icon shape differs per family so the badge stays readable without colour.

| Family  | Icon                | Statuses                                                                                                            |
| ------- | ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| success | circle-check        | Available, Paid (installment), Approved, Posted, Cleared, Completed (step), Active, Received (goods/PO)             |
| warning | clock / hourglass   | Reserved, Pending, Pending Approval, Partially Paid, Partially Received, Agreement Pending, Review, Closed (period) |
| danger  | triangle-alert      | Overdue, Rejected, Bounced, Failed, Lost                                                                            |
| info    | info                | Due Today, Contacted, Interested, Ordered, Requested, Processing, Received (payment)                                |
| special | git-branch / undo-2 | Booked, Reversed, Waived, Negotiation, Exception                                                                    |
| void    | ban                 | Cancelled, Expired, Closed (void/cancelled), Void, Blocked, Hold                                                    |
| primary | lock / flag         | Sold, Customer, Locked, Agreement Completed, Completed (booking), Paid (expense/commission), Closed (PO)            |
| neutral | circle-dashed       | New, Draft, Upcoming, Earned                                                                                        |

**Complete enums** (the source enums are in `prd.md`; if they drift, `prd.md` is right and this table is updated):

| Domain            | Values → family                                                                                                                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Property (8)      | Available→success · Hold→void · Reserved→warning · Booked→special · Sold→primary · Cancelled→void · Transferred→info · Blocked→void                                                                                                                                                               |
| Booking (8)       | REQUESTED→info · PENDING_APPROVAL→warning · CONFIRMED→success · AGREEMENT_PENDING→warning · AGREEMENT_COMPLETED→primary · COMPLETED→primary · CANCELLED→void · TRANSFERRED→info                                                                                                                   |
| Installment (7)   | Upcoming→neutral · Due Today→info · Partially Paid→warning · Paid→success · Overdue→danger · Waived→special · Cancelled→void                                                                                                                                                                      |
| Payment (5)       | Draft→neutral · Received→info · Posted→success · Cancelled→void · Reversed→special                                                                                                                                                                                                                |
| Cheque sub-status | Pending→warning · Cleared→success · Bounced→danger                                                                                                                                                                                                                                                |
| Lead pipeline (9) | New→neutral · Contacted→info · Interested→info · Qualified→warning · Site Visit→info (icon: map-pin; `--accent-text` is no longer a status colour because it is nearly identical to `--warning` and sat next to Qualified) · Negotiation→special · Booking→success · Customer→primary · Lost→void |
| Journal           | Draft→neutral · Review→warning · Posted→success · Locked→primary · Reversed→special                                                                                                                                                                                                               |
| Approval          | Pending→warning · Approved→success · Rejected→danger · Expired→void · Cancelled→void                                                                                                                                                                                                              |
| Expense           | Requested→info · Approved→success · Verified→success · Paid→primary · Rejected→danger                                                                                                                                                                                                             |
| Purchase order    | Draft→neutral · Ordered→info · Partially Received→warning · Received→success · Closed→primary · Cancelled→void                                                                                                                                                                                    |
| Commission        | Earned→neutral · Approved→success · Paid→primary                                                                                                                                                                                                                                                  |
| Accounting period | Open→success · Closed→warning · Locked→primary                                                                                                                                                                                                                                                    |

**Word collisions and display labels.** The "one word, one colour" rule is broken by the enums themselves: the same word maps to different families in different domains. Fix by giving the _display label_ (not the enum value) a distinct word wherever the colour differs; `prd.md` enums are unchanged.

| Enum value (domain)        | Family  | Display label  | Collides with               |
| -------------------------- | ------- | -------------- | --------------------------- |
| Received (Payment)         | info    | Received       | — keeps the word            |
| Received (PO / goods)      | success | Goods received | Payment Received (info)     |
| Paid (Installment)         | success | Paid           | — keeps the word            |
| Paid (Expense, Commission) | primary | Settled        | Installment Paid (success)  |
| Completed (workflow step)  | success | Done           | Booking Completed (primary) |
| Completed (Booking)        | primary | Completed      | — keeps the word            |
| Closed (Accounting period) | warning | Period closed  | PO Closed (primary)         |
| Closed (PO)                | primary | Closed         | — keeps the word            |

`StatusBadge` takes `domain` + `value` and resolves family, icon **and** display label from one map, so nobody picks a colour by hand.

### 2.6 Distribution

65 % neutral surfaces (white/light grey) · 20 % primary (sidebar/headers) · 10 % secondary neutrals · 5 % accent/semantic. Never a rainbow dashboard.

### 2.7 Dark mode (optional; light is default)

Never an inverted palette. `--bg #111113` · `--surface #1C1C1E` · `--surface-elevated #2C2C2E` · `--surface-sunken #0D0D0F` · `--text #F5F5F7` · `--text-2 #B8B8BD` · `--text-muted #98989D` (4.9:1 on elevated) · `--border rgba(255,255,255,0.08)` · `--border-subtle rgba(255,255,255,0.04)` · `--border-strong rgba(255,255,255,0.14)` · `--border-input #7C7C80` (≥ 3.3:1 on surface and elevated). Semantic (all ≥ 4.5:1 on their 12 % tint over surface **and** elevated): success `#34D399`, warning `#FBBF24`, danger `#F97F7F`, info `#63A7FA`, special `#AE94FA`, void `#9EA5B1`. Accent becomes `#D4B85C`; accent-text `#D4B85C`.

**Primary is not a fill in dark mode.** `#1A1A2E` on `#1C1C1E` is 1.0:1 — an invisible button. Dark overrides: `--primary-fg #A5A5E0` (status "Sold/Customer/Locked", chart series, text links), `--action #E5E5EA` with `--on-action #1A1A2E` (primary button, selected checkbox), `--focus` = `--accent`. The sidebar stays `#1A1A2E`. Row hover `rgba(255,255,255,0.04)`, selected `rgba(255,255,255,0.08)`. Elevation in dark mode comes from the lighter `--surface-elevated` plus `--border`, not from shadows. Every component story is snapshotted in light and dark (§15).

## 3. Typography

**Typography stack.** **Inter** — chosen for excellent optical sizing, clean proportions at small sizes, superb tabular figures, and a modern, premium character that pairs naturally with data-dense interfaces. Self-hosted (bundled via `@fontsource/inter`; no CDN).

- Defined centrally in `packages/ui/src/styles/theme.css`: `--font-sans: "Inter", system-ui, sans-serif;`.
- **Single-File Font Change Rule:** If the font family is ever changed, changing the `--font-sans` variable in `packages/ui/src/styles/theme.css` automatically and instantly updates all typography across every app and component.

Global: `font-variant-numeric: tabular-nums slashed-zero` on all numbers, tables and figures. All typography is rendered in English with standard Latin numerals. Enable `font-feature-settings: "cv11"` for single-storey `a` (cleaner in UI context). Disable Tailwind's default `text-*` sizes in `@theme` (`--text-*: initial`) so only the sizes above exist.

**Standard Heading & Text Utility Classes (Consume Centrally):**

- `.text-display` → 28px, 600 weight, line-height 1.15, tracking -0.02em (Dashboard hero titles)
- `.text-h1` → 22px, 600 weight, line-height 1.2, tracking -0.015em (Page titles, primary section headers)
- `.text-h2` → 17px, 600 weight, line-height 1.3, tracking -0.01em (Card headers, modal titles)
- `.text-h3` → 14px, 600 weight, line-height 1.4 (Subsection headings, secondary groups)
- `.text-h4` → 12px, 600 weight, line-height 1.4, tracking 0.01em (Form field labels, uppercase group tags)
- `.text-h5` → 11px, 600 weight, line-height 1.3 (Sub-labels, metadata headers)
- `.text-h6` → 11px, 600 weight, uppercase, tracking 0.05em (Micro chips, indicator labels; was 10px — no text below 11px anywhere)
- `.text-body` → 14px, 400 weight, line-height 1.6 (Standard body text)
- `.text-caption` → 11px, 400 weight (Timestamps, footnotes)
- `.text-small` → 12px, 400–500 weight, line-height 1.4 (Metadata; replaces Tailwind's `text-sm`, which is 14px and must not be used)
- `.text-th` → 12px, 600 weight, uppercase, tracking 0.04em, `--text-muted` (Table column headers only)

| Level                   | Size / weight       | Line height | Letter spacing | Utility Class           | Notes                   |
| ----------------------- | ------------------- | ----------- | -------------- | ----------------------- | ----------------------- |
| Display / Hero          | 28 / 600            | 1.15        | −0.02em        | `text-display`          | Dashboard hero headings |
| H1 / Section            | 22 / 600            | 1.2         | −0.015em       | `text-h1`               | Page-level sections     |
| H2 / Card header        | 17 / 600            | 1.3         | −0.01em        | `text-h2`               | Card titles, groups     |
| H3 / Subsection         | 14 / 600            | 1.4         | 0              | `text-h3`               | Secondary groups        |
| H4 / Label              | 12 / 600            | 1.4         | 0.01em         | `text-h4`               | Form group headings     |
| H5 / Sub-label          | 11 / 600            | 1.3         | 0.01em         | `text-h5`               | Metadata headers        |
| H6 / Micro-label        | 11 / 600 upper      | 1.3         | 0.05em         | `text-h6`               | Micro chips, badges     |
| Body                    | 14 / 400            | 1.6         | 0              | `text-body`             | Default text            |
| Body medium             | 14 / 500            | 1.5         | 0              | `font-medium`           | Emphasized body text    |
| Small / metadata        | 12 / 400–500        | 1.4         | 0              | `text-small text-muted` | Small metadata          |
| Table column header     | 12 / 600 upper      | 1.3         | 0.04em         | `text-th`               | Column headers only     |
| Caption                 | 11 / 400            | 1.3         | 0.01em         | `text-caption`          | Footnotes, timestamps   |
| Button                  | 13 / 500            | 1.0         | 0.01em         | `text-btn`              | All button labels       |
| Figures                 | 14–22 / 600 tabular | 1.2         | 0              | `tabular-nums`          | Right-aligned in tables |
| Hero number (dashboard) | 32 / 600 tabular    | 1.0         | −0.02em        | `text-hero-num`         | At most one per card    |

Rules: sentence case for prose, descriptions, and page titles; uppercase is reserved strictly for tracked micro-labels (`.text-h6`, `.text-h4` group tags) and table column headers (`.text-th`); no decorative eyebrow text; line length < 80 characters in prose.

### 3.1 Script, number and date formatting (one formatter per type, all in `packages/ui/format`)

- **Bengali script.** Customer names, addresses, mouza/khatian/daag notes and deed descriptions will be entered in Bangla, and Inter has no Bengali glyphs, so the browser would pick an arbitrary fallback. Set `--font-sans: "Inter", "Noto Sans Bengali", system-ui, sans-serif;` with `@fontsource/noto-sans-bengali` (400/500/600) self-hosted. This is a script fallback, not a second font family. Mark such content `lang="bn"`; Bengali text gets line-height +0.1 (body 1.7). UI chrome stays English; user data is never transliterated or have its digits converted. Sort/search with `Intl.Collator("bn")`.
- **Money.** `BDT ` prefix, lakh/crore grouping: `BDT 5,00,000`, `BDT 1,25,00,000`. Implement via `en-IN` grouping with a `BDT ` prefix. Never use the `৳` symbol. Store integer paisa or decimal strings, never floats. Decimals: ledgers, receipts, statements and journal lines show 2 dp (`BDT 5,00,000.00`); lists and KPIs show 0 dp; KPI compact form `BDT 5.2 L` / `BDT 1.8 Cr` with the exact value in a tooltip. Negative: `-BDT 50,000` in the UI, `(BDT 50,000)` in reports. Zero is `BDT 0`, never a dash. Never round inside a table.
- **Area.** Always show the unit (`3.50 katha`, `1,440 sq ft`), one unit per column, 2 dp max. Katha/bigha/decimal sizes differ by region, so conversion factors are a tenant setting, never hard-coded.
- **Dates and time.** `03 Oct 2026`; time `02:30 PM`; timezone is Asia/Dhaka and is shown explicitly only in audit entries and Posting Seals. Fiscal year is a company setting (the chip reads `FY 2026–27`).
- **Other.** Phone `+880 1XXX-XXXXXX`; percentages 1 dp; document numbers (`RCPT-2026-000123`) are tabular and never wrap.

## 4. Spacing, radius, elevation

**Space scale** (4-px base; Tailwind v4 `--spacing: 0.25rem`, so step _n_ = _n_ × 4 px). **Allowed steps only:** `1` 4 · `2` 8 · `3` 12 · `4` 16 · `5` 20 · `6` 24 · `8` 32 · `10` 40 · `12` 48 · `16` 64 · `20` 80 · `24` 96 (px). Steps 7, 9, 11 and so on are forbidden and caught by lint. (The earlier table listed `7` = 32 px and `10` = 64 px, which does not match Tailwind and produced wrong sizes.)

**Border radius (Configured centrally in `theme.css` via `--radius-*`):**

- Inputs & Buttons: `8px` → **`rounded-button`**
- Cards & Table Containers: `12px` → **`rounded-card`**
- Modals, Popovers & Dialogs: `16px` → **`rounded-modal`**
- Badges & Avatars: `9999px` → **`rounded-full`**
  Tailwind's built-in `rounded-sm/md/lg/xl` are disabled (`--radius-*: initial` in `@theme`) because their sizes (4/6/8/12 px) contradict the names this document used to alias. Changing a radius in `packages/ui/src/styles/theme.css` (e.g. changing `--radius-button` to `4px` or `12px`) immediately propagates across all buttons across the entire software.

**Predefined Layout Container Classes (Single Source of Truth):**

- `.container-page`: `p-4 md:p-6 space-y-6 max-w-container mx-auto w-full` (where `--max-w-container: 1600px` is mapped in `@theme`)
- `.card-surface`: `bg-surface border border-border rounded-card p-5 shadow-sm`
- `.card-workspace`: `bg-surface border border-border rounded-card overflow-hidden shadow-sm`

**Shadows:** `sm` `0 1px 2px rgba(0,0,0,0.04)` (subtle lift) · `md` `0 4px 12px rgba(0,0,0,0.08)` (cards, elevated elements) · `lg` `0 8px 24px rgba(0,0,0,0.12)` (modal/dropdown). No heavy shadows, no glass/blur, no gradients except the single chart fill in §7.2.

**Borders:** 1px solid with `--border` for decorative separation. Never heavier than 1px except the ledger double-rule (§7.1) and the 2px focus ring.

**Density (user setting, remembered):** Comfortable (row 48 px) · **Compact (row 40 px, default on Desktop)** · Dense (row 32 px). Tokens scale row height and cell padding only; type stays 14 px.

### 4.1 Page Shell & 3-Tier Grid Standard

Every list/workspace page follows an identical, disciplined 3-tier container structure inside `.container-page` (other page types: §4.4):

- **Tier 1 (Page Header Row):** Left side holds breadcrumb path + H1 page title + context chip; Right side holds primary action button (`+ New Booking`, `+ Add Property`) and secondary filter actions.
- **Tier 2 (KPI Metric Summary Cards):** 3 to 4 metric cards in a responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`). Gives instant operational health (e.g. Total Units, Sold, Booked, Overdue Collection).
- **Tier 3 (Main Data Workspace):** Full-width card container wrapping the active view: `DataTable` or `Plan View` with search toolbar, view toggles, and bulk action bar.

### 4.2 Multi-Column Form Grid Architecture

Real estate entities carry 15–25 fields (Mouza, Khatian, Daag, Plot size, Price/katha, Facing, Road width, Installment count). Never stack forms in a single endless vertical column:

- **Standard 2-Column Grid:** All create/edit forms render a responsive 2-column grid (`grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4`).
- **Logical Fieldset Grouping:** Fields are grouped under subtle uppercase section labels (e.g. `LOCATION & BOUNDARIES`, `PRICING & SCHEDULE`, `BUYER INFORMATION`) separated by a hairline `--border` rule.
- **Full-Width Spans:** Complex inputs (Notes, Address, Payment breakdown summary, Terms) explicitly span `col-span-full`.

### 4.3 Control heights, layering, breakpoints (tokens in `theme.css`)

| Token group    | Values                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Control height | `control-sm` 32 · `control-md` 36 · `control-lg` 40 · all controls 44 on touch (<768 px). Buttons, inputs, selects and date pickers share this scale; adjacent controls always match. |
| Z-index        | sticky 10 · header 20 · sidebar 30 · drawer 40 · modal 50 · popover/dropdown 60 · command palette 70 · toast 80 · tooltip 90. No other values.                                        |
| Breakpoints    | `md` 768 · `lg` 1024 (as in §9). `sm` 640 is used for grids only.                                                                                                                     |
| Icon size      | 16 (inline/table) · 18 (buttons, nav) · 20 (headers, empty states)                                                                                                                    |

### 4.4 Page templates

The 3-tier shell (§4.1) is the **list** template. The others: **Detail** — entity opens in a drawer from lists; a full page only when it has tabs and its own URL (Customer 360), with header (title, status badge, primary action), summary strip, then tabs. **Form / wizard** — max-width 960, §4.2 grid, sticky footer with Cancel + primary, numbered steps for sequences. **Report** — filters row, summary, chart/table, export; no KPI cards required. **Dashboard** — display title, 3–4 KPI cards, at most 4 charts from §7.2. **Settings** — left sub-navigation, one card per group, save per card. **Auth** — `--surface-dark` background, centred 400 px card, no cognitive-test steps (WCAG 3.3.8). Tier 2 (KPI cards) is optional outside list pages.

## 5. Application shell

Fixed sidebar + top header + scrolling main — identical on both clients.

**Sidebar:** `--secondary` (#17160F), 260 px (collapsed 72). Inactive text `rgba(255,255,255,0.65)` (≥ 4.5:1 on obsidian secondary), active `#FFFFFF`, active background `rgba(242,101,34,0.18)`, active indicator `--primary` 3 px bar left edge, hover `rgba(255,255,255,0.05)`. Icons accompany labels, never replace them. Groups: Overview · CRM & Sales · Property · Collections · Finance · Procurement · Reports · System, with separators. Group labels: 11px, font-weight 500, `rgba(255,255,255,0.50)`, uppercase, letter-spacing 0.05em.

**Header:** 56px height. Unified `--secondary` (#17160F) background matching the sidebar, seamless curved border transition to workspace. Breadcrumb in dark-variant, page context, global search bar (with ⌘K shortcut), **branch switcher**, **System Engine & Mode Badge**, fiscal-year/period badge, notifications, user profile menu.

**Command palette** (`Ctrl/⌘ K`): elevated white surface, `rounded-modal`, 1px `--border-strong` border, grouped results (customers, leads, properties, projects, bookings, payments, receipts, journals) **and actions** ("New booking", "Record payment", "Go to ledger"), visible shortcuts, recent items first.

**Keyboard model (Linear-style):** `G` then a letter navigates (`G P` properties, `G L` leads, `G C` collections, `G A` accounting); `N` new record in context; `/` focuses table filter; `J/K` move row selection; `Enter` opens the drawer; `Esc` closes; `Ctrl/⌘ S` saves where relevant. Shortcuts are shown in tooltips and in a `?` cheat-sheet. Never override native browser/OS shortcuts. Single-character shortcuts (`N`, `/`, `J/K`, `G …`) are active only when focus is not in an editable field and can be turned off or remapped in Settings (WCAG 2.1.4).

### 5.1 The one structural difference: window chrome

Desktop renders macOS traffic-light clearance or minimal custom min/max/close on Windows/Linux (logic in `apps/desktop/src/platform/`, never in `packages/ui`). Web renders no window controls. Nothing else in the shell differs.

### 5.2 Sync and connectivity states (Desktop local engine and Web)

The header badge (§5) shows the mode; this adds the states users actually hit. Each is icon + text + family colour, and the badge opens a small popover with details.

| State       | Family  | Text                         | Behaviour                                                                                                       |
| ----------- | ------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Synced      | success | `Synced · 2 min ago`         | Default on Cloud mode                                                                                           |
| Syncing     | info    | `Syncing 3 changes`          | No blocking, no spinner overlay                                                                                 |
| Offline     | warning | `Offline · 5 changes queued` | Reads work; writes queue; posted financial documents show "Posted locally — not yet synced" in the Posting Seal |
| Conflict    | danger  | `2 conflicts need review`    | Opens a drawer with both versions side by side; financial postings are never auto-merged                        |
| Sync failed | danger  | `Sync failed · SYNC_TIMEOUT` | Error code mapped to an action; Retry button                                                                    |

## 6. Core components

**Buttons.** Primary = `--action` fill, `--on-action` text (17.1:1 in light), `rounded-button`, one per view — page, drawer or modal (Save, Create, Confirm, Book). Secondary = `--surface` fill + `--border-input` border. Ghost = transparent, `--text` text, hover `--surface-sunken`. Destructive = `--danger` fill, white text (5.9:1), only for destructive actions. Accent button: rare, premium/featured only, `--accent` fill. Transition 100ms ease-out on `background-color`, `opacity` and `transform` only. Height: sm = 32px, md = 36px, lg = 40px (44px on touch, §4.3). States for every variant: default, hover, pressed, focus-visible, disabled, loading (label stays, a 14px progress ring replaces the leading icon, width does not change). **Focus ring (all interactive elements): 2 px solid `--focus` with 2 px offset** (`--focus` is `--primary` in light and `--accent` in dark and on dark surfaces; ≥ 3:1 on every surface).

**Tables** are central: sticky header, sortable, column visibility, server pagination, selection + bulk actions, export, virtualization > 100 rows, hover `rgba(0,0,0,0.02)`, selected `rgba(26,26,46,0.06)`, no vertical rules. Header uses `text-th` (12/600 `--text-muted` uppercase). Money columns are right-aligned, tabular; **negative amounts are shown with a leading minus and parentheses in reports** (`(BDT 50,000)`) and are distinguishable without colour. Totals rows get the **double rule** (§7.1). Shared `DataTable`; on Web `<768px` it becomes `variant="cards"` (§9).

**Forms.** Visible labels (never floating), grouped fields, logical tab order, inline validation with the error text tied via `aria-describedby`, single column where it helps. Input height: 40px (`control-lg`) in forms and 36px (`control-md`) in toolbars and filters, always equal to the adjacent button. Border: `--border-input`. Background: `--surface`. Focus: `--primary` ring. Money inputs accept typed numeric digits and always display grouped (`BDT 5,00,000`). Long workflows (booking: Customer → Property → Pricing → Discount approval → Payment → Installment plan → Confirmation) are visible **numbered steps** (this content really is a sequence).

**Modals** 400–640 px (up to 960 for complex forms) for confirmations, destructive actions, short forms. `rounded-modal`, `shadow-lg`. **Drawers** for entity detail (Customer 360, Lead, Property, Booking, Payment, Journal, Audit history) so context is preserved.

**Badges:** soft 12% tint of the family colour, text in the family colour, icon + label (§2.5), radius `full` (pill shape). Never a one-off value.

**Notifications:** severity by family; critical financial operations never rely on a toast alone — they leave a persistent, confirmable state (e.g. the posted journal shows its Posting Seal).

**Loading, Skeletons & Zero-Spinner Policy (Apple-Style Perceived Speed):**

- **ZERO Full-Screen Spinners:** Never render full-page loading spinners, circular loaders, or blank white flickering screens.
- **Shape-Matching Skeleton Screens:** Every single view, table, card, and drawer renders a skeleton component that exactly mirrors the layout geometry of the incoming data (`DataTableSkeleton`, `StatCardSkeleton`, `FormGridSkeleton`, `DrawerSkeleton`).
- **Apple-Inspired Breathing Pulse (`skeleton-breathe`):** Skeletons must never sit as dead static gray blocks. They feature a calm, organic Apple-style breathing wave (opacity oscillating smoothly between `0.45` and `0.85` via CSS `cubic-bezier(0.4, 0, 0.6, 1)` over 1.5s). It renders with zero JavaScript CPU overhead using native Tailwind v4 tokens (`bg-surface-sunken`).
- **Realistic Layout Placeholders:** Skeletons do not use uniform boxes. Table rows render randomized realistic column widths (e.g. `w-24`, `w-40`, `w-20` right-aligned for amounts) so the layout matches natural text and currency figures.
- **Zero Cumulative Layout Shift (CLS = 0):** The skeleton container reserves the exact pixel dimensions of the target component. When TanStack Query resolves data from the cache or DB, the transition is instantaneous with zero layout jumping.

**Empty & Error States:**

- **Empty States:** Clear, elegant line-art icon in `--text-disabled`, explanation of what is empty, and exactly one primary call-to-action button (e.g. "No Bookings Found" → `+ Create First Booking`).
- **Error Handling:** Map directly from typed backend `error.code` to localized actionable message. Never dump raw stack traces or apologize. Copy is plain, active voice, sentence case; an action keeps the same name through the flow ("Post journal" → toast "Journal posted").

### 6.1 Component catalogue (`packages/ui` — reuse before creating)

| Component                                      | Variants / key props                                                            | Required states                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `Button`, `IconButton`                         | primary · secondary · ghost · destructive · accent; sm/md/lg                    | default, hover, pressed, focus, disabled, loading          |
| `Input`, `MoneyInput`, `AreaInput`, `Textarea` | prefix/suffix, helper, error                                                    | default, focus, filled, error, disabled, read-only         |
| `Select`, `Combobox`                           | searchable above 7 options; async for customers/properties; inline "Create new" | open, empty result, loading, error                         |
| `DatePicker`, `DateRange`                      | typed entry in `DD MMM YYYY`; presets for reports                               | focus, invalid, disabled dates                             |
| `Checkbox`, `Radio`, `Switch`                  | with label and description                                                      | checked, indeterminate, focus, disabled                    |
| `StatusBadge`                                  | `domain` + `value` (§2.5)                                                       | one per enum value                                         |
| `DataTable`                                    | density, `variant="cards"`, selection, bulk bar, virtualization                 | loading, empty, filtered-empty, error, offline             |
| `Drawer`, `Modal`, `Popover`, `Tooltip`        | sizes per §6                                                                    | open, closing, focus-trapped                               |
| `Tabs`, `Stepper`, `Breadcrumb`, `Pagination`  | `1–25 of 1,284`, page size 25/50/100                                            | active, disabled, overflow                                 |
| `StatCard`, `KPI sparkline`                    | hero number, delta text                                                         | loading, empty, error                                      |
| `Alert` (banner)                               | info · warning · danger · success                                               | persistent; dismissible only for info                      |
| `Toast`                                        | severity by family; 5 s; max 3 stacked; `aria-live="polite"`                    | errors persist until dismissed; Undo where reversible      |
| `FilterBar`                                    | chips + saved views, URL-synced                                                 | empty, many-filters overflow                               |
| `FileUpload`, `DocumentPreview`                | deeds, NID, cheque images; drag-drop + button; type/size limits                 | uploading (inline progress, no spinner), scanned, rejected |
| `AuditTimeline`                                | actor, action, time, field diff, money before/after                             | loading, empty                                             |
| `EmptyState`, `ErrorState`                     | per §6; 403, 404, offline, session-expired                                      | —                                                          |
| Signature four (§7.1)                          | Plan View, Payment Terrace, Balance Beam, Posting Seal                          | per §7.1                                                   |

### 6.2 Cross-cutting patterns

- **Permissions.** Navigation items a role can never use are hidden. Actions that depend on record state stay visible but disabled with a tooltip giving the reason ("Posted records can't be edited"). A forbidden URL shows a 403 page with a request-access action, not a blank screen.
- **Errors.** Field: inline text tied with `aria-describedby`. Form submit: focus moves to the first error and an error summary at the top links to each field. Page: `ErrorState` with the mapped `error.code` and one Retry action. Also built: 404, 403, offline, session expired.
- **Destructive and irreversible actions.** Confirm modal names the object and the consequence; reversals and cancellations require a reason field; the primary button repeats the verb ("Reverse journal").
- **Bulk actions, import, export.** Bulk bar appears on selection with count and actions; import is a 4-step wizard (upload → map columns → validate → confirm) that ends with a downloadable error report; export states the active filters it applies.
- **Tooltips** never carry information that is needed to complete a task; they open after 400 ms and close in 80 ms.

## 7. Signature components (where the boldness is spent)

Everything in this section lives in `packages/ui` and is built once, in Part B. These four — plus the double rule — are the product's visual identity.

### 7.1 The four

1. **Plan View** (property inventory). A clean layout of the project: blocks and roads drawn as fine 1-px lines on `--surface`, roads in `--accent-subtle`, each plot a cell showing its number. Status is encoded by **fill pattern as well as colour**: Available = outline only; Reserved = dotted; Booked = diagonal hatch; Sold = solid primary; Hold/Blocked = cross-hatch, void colour. Hover shows a card with size, facing, price; click opens the property drawer; keyboard navigable (arrow keys move between plots, `Enter` opens). Zoom/pan for large projects; a legend shows the patterns. The dense table view remains the default for operational users; Plan View is the "wow" for sales and directors. Data comes from the generated API (block/road/plot coordinates optional; falls back to a grid layout). Status also uses the family colour for the plot outline and pattern strokes, and the plot number sits on a small `--surface` chip so it stays legible over hatching (≥ 4.5:1). Transferred = outline with corner tick (info); Cancelled = outline with strike line (void). Above ~300 plots render on canvas or virtualised SVG and keep a DOM list for keyboard/screen-reader access; zoom and pan also have +/− buttons (WCAG 2.5.7).
2. **Payment Terrace** (installment schedule / collection health). Each installment is a block whose **height is proportional to its amount**, filled bottom-up with the paid portion, arranged left→right in due-date order (heights follow the amounts, so a large down-payment first makes a descending step and equal installments make a flat terrace). A vertical "today" line crosses the terrace: blocks left of it that are unpaid get danger outline + hatch; the next due block gets an info outline; Partially Paid blocks fill to the paid amount, Waived blocks use a special outline, Cancelled blocks a dashed void outline and are excluded from totals. Totals (paid / due / overdue) sit beneath with a double rule. One glance answers "is this customer on track?". Compact (sparkline-height) variant for table rows and the Customer 360 header.
3. **Balance Beam** (journal entry). A slim horizontal bar under the debit/credit grid split in two: debit total left, credit total right. It shows the difference as a small gap; when `Dr = Cr` the halves meet, the bar turns `--primary`, and, with at least two non-zero lines, the **Post** button becomes enabled. When unbalanced, the difference is stated in words ("Debit is BDT 2,500 more than credit") — colour is never the only signal.
4. **Posting Seal** (immutability). When a journal/payment/receipt is posted, a compact seal appears in its header and drawer: lock icon, "Posted", document number, poster, timestamp, and the line "Corrections require a reversal entry" with a _Reverse_ action if permitted. Reversed items show a linked seal to the reversal. This is the visible face of `RULE-IMMUTABLE`; no Edit/Delete controls exist on sealed records.

### 7.2 Data-visualisation language

Charts are custom React SVG in `packages/ui/charts` (d3-scale/shape only; no chart framework). Rules: horizontal hairline gridlines only (`--border-subtle`); direct labels on marks instead of legends wherever possible; **no pie/donut, no 3D, no rainbow, no dual axes**; tabular numerals; every chart has a text/table alternative (`aria-label` + "View as table"). Palette: categorical max 5 in this order — `--primary-fg`, `--info`, `--accent-text`, `--special`, `--success` — plus `--void` for "other"; each series also gets its own marker or dash style so colour is never the only cue; sequential scale is primary at 5 tints (10/25/45/70/100 %). Comparisons use **solid = actual, outline = target/budget**.

Chart set: KPI card with sparkline (hero number 32 px + 12-month sparkline, no gradient) · **Payment Terrace** · **Aging strip** (one horizontal stacked bar, buckets 1–7/8–30/31–60/61–90/90+ in sequential tint, direct-labelled) · **Pipeline funnel** (horizontal bars with conversion % between stages) · **Budget bullet** (bar vs target with 70/85/100 % ticks) · **Project profit waterfall** (revenue → costs → profit) · **Cash-flow line** with a single light primary area fill (the only permitted gradient: opacity 8 % → 0 %).

## 8. Motion & Performance (High-Velocity Zero-Lag Execution)

This is an intensive ERP where operators spend 8+ hours performing high-speed transactions. Animations must never make the software feel sluggish, slow down work, or block user interaction.

- **Instant Micro-Feedback:** Buttons, row selections, and tab switches respond within **80ms–100ms** (hardware-accelerated `opacity` and `transform`).
- **Zero Render Blocking:** No entrance stagger animations on cards or table rows. Data appears instantly when ready.
- **The Three Approved Decorative Micro-Motions Only** (structural transitions are listed after them):
  1. **skeleton-breathe** — Apple-style subtle breathing shimmer on loading blocks (`opacity: 0.45 ↔ 0.85`, 1.5s ease-in-out).
  2. **rule-draw** — 180ms fine hairline draw for the ledger double-rule upon transaction post.
  3. **settle-flash** — 300ms subtle background tint flash when a row updates live via background sync, without shifting or morphing numbers.
- **Reduced Motion:** If `prefers-reduced-motion` is active, or the user turns on Settings → Reduce motion, all transitions collapse to 0 ms and skeletons render static at 0.65 opacity. (Low-spec hardware detection was removed: it cannot be done reliably.)
- **Structural transitions (allowed, `opacity` and `transform` only):** tooltip/popover fade 80 ms; modal and command palette fade + 4 px rise 120 ms (exit 80 ms); drawer slide 160 ms ease-out (exit 100 ms); toast fade 150 ms; accordion/collapse 120 ms. Nothing else animates.

## 9. Responsive strategy

**Desktop (Part B):** windows ≥ 1024 px, optimised for 1280–1600 px; no tablet/mobile layouts. **Web (Part C):** identical components ≥ 1024 px; additionally 768–1023 px (tablet: collapsible sidebar, drawers become full-height sheets) and < 768 px (mobile: bottom navigation for the top 4 destinations, `DataTable variant="cards"`, bottom sheets for filters/actions, touch targets ≥ 44 px, Plan View becomes a scrollable pannable map with a list toggle). Responsive behaviour is added to shared components via props/variants, never by forking.

## 10. Accessibility

WCAG 2.2 AA on both clients. Full keyboard operation; visible focus everywhere (§6); semantic HTML + ARIA; status never colour-only; contrast values above; minimum target 24 × 24 px (44 px on touch); `axe` runs in Vitest component tests and Playwright and blocks CI; screen-reader labels for every chart mark group; forms announce errors. The lock/seal states have text equivalents.

WCAG 2.2 specifics this product must handle: **2.4.11 Focus Not Obscured** — sticky headers, sticky table headers and bottom action bars set `scroll-padding` so a focused element is never hidden behind them; **2.5.7 Dragging Movements** — every drag (Plan View pan, column reorder, file drop) has a click/button alternative; **2.5.8 Target Size** — 24 × 24 px minimum, 44 px on touch; **3.3.7 Redundant Entry** — wizards reuse data already entered; **3.3.8 Accessible Authentication** — no cognitive tests, paste allowed in password fields; **2.1.4 Character Key Shortcuts** — see §5.

## 11. Iconography

**Lucide** only (version pinned in `package.json`; every icon name in this document is checked by a unit test against the pinned version), 16/18/20 px. Icons support text; they never replace it (except in the collapsed sidebar, which shows tooltips). Stroke width: 1.75 (slightly lighter than Lucide default for a refined feel).

## 12. Print / PDF (Institutional Voucher & Security Standard)

Customer-facing print layouts (Money Receipts, Allotment Letters, Booking Agreements, Account Statements) represent the company's credibility and institutional authority:

- **Clean Document Typography:** Crisp white background, 0.5-pt crisp hairline borders, company header with verified branding, English currency words with BDT prefix (`Taka Five Lakh Only` / `BDT 5,00,000`).
- **Verification QR Code:** Every printed money receipt and booking voucher embeds a cryptographically verifiable QR code linking to the tenant verification endpoint (`/verify?voucher=...`), making forged receipts impossible.
- **Tamper-Evident Watermark:** Subtle institutional background watermark (`EXZA AUTHENTICATED • IMMUTABLE RECORD`).
- **Three-Tier Signatory Block:** Standardized footer with 3 authorized signature boxes: `Prepared By (Executive)` · `Verified By (Accounts)` · `Authorized Signatory (MD / Director)`.
- **Cancelled / Void Protection:** Reversed or cancelled vouchers (a merely reconciled voucher is still valid and carries no stamp) carry a bold diagonal `REVERSED / VOID` watermark stamp across the page.
- **Print basics:** A4, 15 mm margins, Inter 9–10 pt body (never below 8 pt), tabular numerals, page `n of N` and document number in every footer. Must remain fully legible in greyscale — status shown as text, never colour alone. QR minimum 22 × 22 mm with a quiet zone.
- **QR security:** the QR carries a signed, expiring-optional token, not a guessable voucher id. The public verify page shows only what is needed to confirm authenticity (document number, date, amount, status, company) and never customer PII.

## 13. Never do

Generic blue SaaS look · neon or cyberpunk · glassmorphism/blur · gradients beyond §7.2 · oversized radii · heavy shadows · pie/donut/3D/rainbow charts · decorative icons · off-palette colours · inconsistent spacing/radius · a second Latin font family (the Bengali script fallback in §3.1 is allowed) · animated financial numbers · staggered entrance animations · large hero illustrations · marketing-style KPI cards · low-contrast grey text · colour-only status · a dashboard that looks like a listing site · a Web version that behaves differently from Desktop without a platform reason · arbitrary Tailwind values (`[...]`) · raw hex in components · Tailwind default `rounded-*` / `text-sm` / off-scale spacing · information that exists only in a tooltip · a primary-colour fill in dark mode.

## 14. Before shipping any screen

Is the primary action obvious? Are the five questions in §1 answered at a glance? Does every status show icon + text + tint? Does it pass `axe`, keyboard-only use, and reduced-motion? Does money read `BDT 5,00,000`? For Web: does it use the exact `packages/ui` component from Part B, with only §5.1/§9 differences? Does every colour come from a token, and do light **and** dark pass contrast? Are loading, empty, filtered-empty, error, offline and no-permission states built? Are formatters used for money, area and dates? If any answer is no, refine before shipping.

## 15. Governance and enforcement

This document only works if drift is caught automatically.

- **Extending the system.** A new pattern needs one PR containing: the `theme.css` change (if any), this document updated, a Storybook story with all states in light and dark, and a changelog line below. Only then is it used in a feature.
- **Lint.** ESLint with `eslint-plugin-tailwindcss` (`no-arbitrary-value`) plus a banned-class rule (`rounded-sm|md|lg|xl`, `text-xs|sm|lg|xl`, spacing steps 7/9/11…, Tailwind palette colours). Stylelint bans hex/rgb/hsl outside `theme.css`.
- **Contrast test.** A Vitest test reads the tokens from `theme.css` and asserts every foreground/background pair in `contrast-pairs.ts` (text on surface/bg/sunken, badges on 12 % tints, sidebar text, borders ≥ 3:1) for light and dark. The numbers in §2 are generated from, or checked against, this test.
- **Visual regression.** Playwright snapshots of every catalogue component state across light/dark and Compact/Comfortable density.
- **Icon test.** Every Lucide name referenced here exists in the pinned version.
- **Status test.** Every enum in `prd.md` has an entry in the status map (family, icon, display label).

## 16. Meridian Design Intelligence & Craft Standards (Skills Synthesis)

This section persists the core visual, interaction, and typographic intelligence distilled from our active skill sets (`better-ui`, `better-typography`, `frontend-design`, `ui-ux-pro-max`). Any agent or human developer building or upgrading ExzaEstate components must apply these rules directly from this document without needing to re-read raw skill directories.

### 16.1 Concentric Border Radii & Nested Geometry

- **Concentric Formula:** Whenever an element is nested inside a container with padding, the inner element's border-radius must follow:
  $$R_{\text{inner}} = \max(0, R_{\text{outer}} - \text{padding})$$
  _(Example: A `rounded-modal` container with 16px padding must host inner items with `rounded-button` or `rounded-card` so inner corners don't pinch against outer corners)._
- **Outer Elevation vs Inner Structure:** Outer containers use subtle box-shadows for elevation (`shadow-xs` / `shadow-lg`); internal dividers use crisp hairline borders (`border border-border/60`). Never stack multiple heavy borders inside each other.

### 16.2 Optical Alignment & Icon Harmonization

- **Optical Nudges:** Geometric centering often looks off-center to human eyes. When placing icons next to text, inside round containers, or in action buttons:
  - Play triangles, chevron indicators, and asymmetric icons need a 0.5px–1px manual optical nudge.
  - Buttons with text + icon: Align vertically with `items-center gap-1.5` or `gap-2`, ensuring icon size matches line-height.
- **Icon Stroke-to-Weight Matching:**
  - Lucide icons next to Regular (400) or Medium (500) text: stroke `1.5` to `1.75`.
  - Lucide icons next to Semibold (600) or Bold (700) text: stroke `2.0`.
  - Never place a hairline 1px icon beside bold header text.
- **Single-SVG Recoloring:** Always use `currentColor` in SVG icons. State variations (hover, active, muted) are driven purely by CSS text-color classes (`text-text-muted`, `text-primary`, `text-accent-text`), never by swapping separate SVG files.

### 16.3 Tactile Interaction Physics & Micro-Motion

- **Tactile Scale on Press:** Interactive buttons, tabs, and action cards must provide crisp tactile feedback using `active:scale-[0.98]` (or `active:scale-[0.96]` on small icon buttons).
- **Duration Restraint:** High-frequency interactions (hover, button click, dropdown select) must execute in $\le 150\text{ms}$ with `ease-out`. Never apply slow 300ms+ animations to everyday clicks.
- **Interruptible Transitions:** Always declare exact transition properties (`transition-colors`, `transition-transform`, `transition-opacity`). **NEVER use `transition: all`**, which causes layout thrashing and smears during theme flips.
- **Theme Swap Safety:** Theme transitions must suppress CSS transitions during theme switching (`*, *::before, *::after { transition: none !important }`) to snap instantly without rainbow smearing.

### 16.4 Advanced Financial & ERP Typography

- **Mandatory Tabular Numerals:** Every financial figure, BDT money display, countdown, voucher number, percentage, and table cell containing numbers **must** include `font-mono tabular-nums` (enforcing `font-variant-numeric: tabular-nums`). This prevents jitter and ensures ledger columns align with decimal precision.
- **Semantic Text Wrapping:**
  - `text-wrap: balance` on headers and section titles to eliminate single-word orphan wraps.
  - `text-wrap: pretty` on paragraph descriptions to avoid typographic widows.
  - `white-space: nowrap` on badges, status pills, and short action labels.
  - `overflow-wrap: break-word` and `truncate` on user names, lead titles, and reference IDs.
- **Line Length Measure Cap:** Long-form descriptions and narrative content must be capped at 60–75 characters (`max-w-prose` or `max-w-xl`) for readability.
- **Natural Copy Case:** Store and render strings in natural sentence case. Never hardcode ALL CAPS in source strings; apply `uppercase tracking-wider` purely via CSS tokens for small metadata tags.
- **Smart Punctuation:** Use en-dashes (`–`) for date/number ranges (e.g. `FY 2026–27`, `1–7 days`), curly quotes in prose, and true ellipsis (`…`) rather than three separate dots (`...`).

### 16.5 Anti-Patterns & Visual Discipline

- **Zero Mock Fallbacks in UI Components:** UI components must **never** hardcode fake mock arrays or fallback mock numbers (`14800000000n`, `24 units`, `8 VIP site visits`). Clean `0`, `0n`, or empty states (`All Operational Workflows Up To Date`) must be rendered when backend data is absent. Real data is seeded via `pnpm db:seed:demo`.
- **Zero Bangla Strings in System Chrome:** System navigation, header bars, action centers, and command palettes must be strictly clean English. User names and company profiles in the database must use English text (`Anwar Hossain`, `ExzaEstate Development Ltd.`).
- **Zero AI-Generated Visual Clichés:**
  - Do NOT use Claude-style terracotta/clay accents, neon greens, or cyber glows.
  - Do NOT chop layouts into identical generic cards with identical shadows.
  - Do NOT insert fake numbered markers (`01 / 02 / 03`) unless the content is genuinely an ordered chronological sequence.
- **Spend Boldness in Signature Moments:** Meridian spends its visual boldness exclusively in the 4 signature components: **Plan View (Plot Master Plan)**, **Payment Terrace**, **Balance Beam**, and **Posting Seal**. All supporting chrome remains calm, spacious, and disciplined.

### Changelog

**Rev. 3 (2026-10-06).** Added §16 (Meridian Design Intelligence & Craft Standards) distilling rules from `better-ui`, `better-typography`, `frontend-design`, and `ui-ux-pro-max` into the canonical project constitution. Enforced zero mock data policy, concentric border radius formula, tactile press physics (`active:scale-[0.98]`), and strict English chrome.
**Rev. 2 (2026-10-03).** Recomputed all contrast values: `--accent-text`, `--success`, `--warning`, `--danger`, `--void`, `--special`, `--text-muted` and `--border-input` adjusted so every pair passes; sidebar group labels raised to 0.50 alpha. Added `--primary-fg`, `--action`, `--on-action`, `--focus` and a dark-mode fix for the invisible primary button. Replaced the spacing table with allowed Tailwind steps; removed `rounded-sm/md/lg` aliases; added `text-th`, `text-small`, 11 px floor. Resolved word-collision statuses with display labels; moved Site Visit off the accent colour. Fixed contradictions (badge tint 10 vs 12 %, command-palette 2 px border, 150 vs 100 ms transitions, input vs button heights, `pulse-subtle` vs `skeleton-breathe`, `max-w-[1600px]` arbitrary value). Added: quick reference for AI agents (§0), Bengali font and BDT/area/date formatting (§3.1), control heights, z-index and breakpoints (§4.3), page templates (§4.4), sync states (§5.2), component catalogue (§6.1), cross-cutting patterns (§6.2), structural transitions, WCAG 2.2 specifics, print and QR security, governance (§15).

> **One-line direction:** a calm, precise workspace for land and accounts — Deep Slate, Clean White, and a rare Warm Gold — that becomes unmistakable in four places: the Plan View, the Payment Terrace, the Balance Beam and the Posting Seal.
