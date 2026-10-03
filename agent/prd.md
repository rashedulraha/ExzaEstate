# prd.md — ExzaEstate: Real Estate Business Management & Accounting ERP

> **Version 2.0** · Owner: ExzaZone Agency · Market: Bangladesh
> **Role of this file:** defines **what** to build, **why**, and **for whom** — product scope, user flows, business rules, configuration defaults and acceptance tests. It does **not** decide stack, schema, or API shape; those live in `architecture.md`.
>
> **Status of this version:** complete enough for agents to build from. Items marked **⚠ OWNER-CONFIRM** have a safe, configurable default so development is never blocked, but the business owner / chartered accountant must confirm them **before the first production go-live**.

---

## 0. How to Read and Use This PRD

### 0.1 Companion files (all lowercase, all in `agent/`)

| File                    | Owns                                                                                        | When an agent reads it                          |
| ----------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `AGENTS.md`             | Operating instructions and the authoritative precedence chain                               | First, always                                   |
| `prd.md` (this file)    | Product scope, flows, business rules, config defaults, acceptance tests                     | Second, always                                  |
| `architecture.md`       | Stack, repo layout, data model, API shape, security design, deployment, Dual Mode internals | Any technical decision                          |
| `accounting-rules.md`   | Default chart of accounts, exact posting templates (debit/credit lines) per event           | Any task touching money                         |
| `permissions-matrix.md` | The exact role × permission × scope grid (this PRD gives the intent only)                   | Any task touching access                        |
| `security.md`           | Security controls and requirements                                                          | Any task touching auth, files, secrets, tenancy |
| `rules.md`              | Coding rules, conventions, testing rules                                                    | Every coding task                               |
| `design.md`             | Visual system, components, layout, responsive rules                                         | Frontend tasks only                             |
| `task.md`               | The ordered task list; the task to execute now                                              | Last, to pick the task                          |

**Reading order for an AI agent:** `AGENTS.md` → `prd.md` → `architecture.md` → `accounting-rules.md` / `permissions-matrix.md` (money or access) → `security.md` → `rules.md` → `design.md` (frontend only) → `task.md`.

### 0.2 Who wins when files disagree

- **Product / business behaviour** (what happens, who may do it, when): this file wins.
- **Technical choices** (stack, schema, endpoints, infrastructure): `architecture.md` wins.
- **Account codes and debit/credit templates:** `accounting-rules.md` wins. This file says _which event_ must post and _that it must balance_; that file says _which accounts_.
- **Exact permission grid:** `permissions-matrix.md` wins. This file states the intent in §5.
- If `AGENTS.md` states a different precedence, `AGENTS.md` wins.
- **Never guess.** When two files conflict or a rule is missing, the agent stops, writes the conflict down (in the task notes) and flags it instead of picking silently.

### 0.3 Conventions used in this file

- **Stable IDs, not section numbers.** Modules are `MOD-*`, flows are `FLOW-*`, business rules are `BR-*`, acceptance tests are `AT-*`, configuration keys are `snake_case` in code font. Cross-reference by ID so references survive edits. Architecture IDs (`ARCH-*`, `RULE-*`) refer to `architecture.md`.
- **Priority tags:** **P0** = must exist in the first sellable release (MVP). **P1** = v1 complete, built right after P0. **P2** = later releases; do not build until told, but do not design anything that blocks it.
- **Keywords:** MUST / MUST NOT = mandatory. SHOULD = default unless there is a documented reason. MAY = optional.
- **Config over code:** every number, percentage, threshold, format or policy in this file is a **default stored as company configuration** (catalogue in §17), never a constant in code (BR-09).
- **Money** is always BDT, stored as exact decimals, never floats (§10).

### 0.4 Instructions to AI agents (summary)

1. Build only what the current task in `task.md` asks, and only modules whose priority has been released (§1.3).
2. Every rule in §16 (Business Rules) is a hard constraint. If a requested change violates one, flag it before proceeding.
3. If an acceptance test in §19 relates to the code you touch, it MUST exist as an automated test and pass.
4. When this PRD gives a default, implement it as configuration with that default and move on.
5. Do not add features, roles, statuses or screens that are not in this file. Propose them instead.

---

## 1. Build Strategy — Read This First

### 1.1 Three sequential parts (unchanged owner decision)

ExzaEstate is built in **three sequential parts, not in parallel**:

1. **Part A — Backend.** The NestJS API: every module in scope for the release, every business rule, every report endpoint — built, tested, and Swagger-documented **before any frontend code is written**. At the end of Part A the full sales-to-accounting flow must run end-to-end via Bruno with no frontend.
2. **Part B — Desktop App.** A Tauri 2 + React 19 (Vite) desktop application, built against the completed backend. It is the **primary, first** client. It establishes the shared component library and API hooks (`packages/ui`, `packages/api-client`, `packages/features`). It supports **Dual Mode** (Cloud-Hosted or Local Standalone — see §11).
3. **Part C — Web App.** A Vite + React SPA built **after** the desktop app is functionally complete, reusing the shared packages. It is a feature-equivalent mirror, adapted only for the browser (responsive layouts, no native OS chrome). Cloud-only.

**One backend, two frontends.** Both talk to the same `/api/v1`; the backend never assumes which client is calling (see `architecture.md` ARCH-REPO-LAYOUT, ARCH-FRONTEND). An agent never starts Part B before Part A is complete, nor Part C before Part B is complete, unless explicitly told otherwise.

### 1.2 Release scope: what "complete" means per part

To avoid a months-long build with nothing to show, the **module list is split by priority**. Parts A → B → C are executed **first for P0+P1 (v1.0)**, and only afterwards repeated for P2 modules (v1.x).

| Release            | Contents                         | Done when                                           |
| ------------------ | -------------------------------- | --------------------------------------------------- |
| **v1.0 = P0 + P1** | Everything tagged P0 or P1 in §8 | Parts A, B, C complete for those modules            |
| **v1.x = P2**      | Everything tagged P2 in §8       | Each P2 module goes through A → B → C when released |

Inside Part A, work proceeds in two internal **milestones**, each ending in a demonstrable gate:

| Milestone     | Scope                                                                                                                                                                                                                                                                                                    | Gate (must pass before the next milestone)                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **A-M1 (P0)** | Platform/tenancy, organization, land/project/property, CRM, customers, quotation, discount approval, booking, payment plan, installments, payments, receipts, accounting core, cash/bank, approvals, audit, numbering, periods, migration (opening balances & legacy bookings), dashboard + core reports | The "Golden Flow" (§1.4) passes via Bruno and all P0 acceptance tests in §19 are green |
| **A-M2 (P1)** | Expense/budget, vendor/AP, commission, notifications (SMS/email), Bangla document templates, project profitability, full report set, booking transfer, CSV migration import, employee module                                                                                                             | All P1 acceptance tests green; reports reconcile (AT-14, AT-15)                        |

### 1.3 Priority ladder

| Priority | Modules                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P0**   | MOD-PLATFORM, MOD-ORG, MOD-LAND, MOD-PROJECT, MOD-PROPERTY, MOD-CRM, MOD-FOLLOWUP, MOD-CUSTOMER, MOD-QUOTATION, MOD-DISCOUNT, MOD-BOOKING, MOD-AGREEMENT, MOD-CANCEL-REFUND, MOD-PAYPLAN, MOD-CHARGES, MOD-INSTALLMENT, MOD-PAYMENT, MOD-RECEIPT, MOD-STATEMENT, MOD-AGING, MOD-ACCOUNTING, MOD-COA, MOD-EVENTS, MOD-JOURNAL, MOD-CASHBANK, MOD-ARAP (receivable side), MOD-EXPENSE (vouchers + approval), MOD-DOCS, MOD-NOTIFY (in-app), MOD-APPROVAL, MOD-AUDIT, MOD-NUMBERING, MOD-PERIOD, MOD-DASH, MOD-REPORTS (core set), MOD-SEARCH, MOD-LOCALE, MOD-MIGRATION (manual entry) |
| **P1**   | MOD-EXPENSE (budgets), MOD-VENDOR (vendor master, bills, payments), MOD-ARAP (payable side), MOD-COMMISSION, MOD-NOTIFY (SMS/email), MOD-TRANSFER, MOD-PROFIT, MOD-EMPLOYEE, MOD-REPORTS (full set), MOD-MIGRATION (CSV import), Bangla document templates, Local Standalone packaging (§11)                                                                                                                                                                                                                                                                                         |
| **P2**   | MOD-VENDOR (purchase request → PO → goods receipt), MOD-DEV, MOD-MAINT, MOD-ASSET, MOD-JV, marketing-ROI report, WhatsApp channel, asset depreciation, tenant-consented support access                                                                                                                                                                                                                                                                                                                                                                                               |

> **Standalone note:** Local Standalone _packaging_ is P1, but Part A MUST NOT make decisions that preclude it (`architecture.md` ARCH-DESKTOP-MODE). This is the highest-risk requirement in the product; see §11 and §22.

### 1.4 The Golden Flow (the end-to-end proof for Part A)

`Create company → seed COA → create project & property → create customer → quotation with discount approval → booking request → booking payment posted by Accountant → booking CONFIRMED → installment schedule + receivable + journal + receipt → installment payment (partial, then full) → customer statement = AR ledger → dashboard/report numbers match → cancel a different booking with refund → period close.`

---

## 2. Product Overview

### 2.1 What we are building

**ExzaEstate** is a centralized, API-first business management and accounting ERP **for real estate companies in Bangladesh**, covering the whole operating cycle: land acquisition → project and inventory setup → lead generation → quotation and booking → agreement → installment collection → double-entry accounting → expenses and vendors → management reporting.

**Core promise:** data is entered **once** and cascades. A booking confirmation updates property status, generates the installment schedule, creates the receivable, posts the accounting journal, refreshes dashboards, and writes the audit log — **all inside one database transaction**.

### 2.2 Who buys it (customer segments)

| Segment                                | Typical business                                      | Notes                                                                     |
| -------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| **Land / plot developers**             | Purchase land, develop, sell plots on installments    | Core v1 target. Land units: Decimal, Katha, Bigha, Acre                   |
| **Apartment / commercial developers**  | Build and sell flats, shops, offices, parking         | Core v1 target. Hierarchy: Project → Block → Floor → Unit                 |
| **Mixed developers**                   | Both of the above                                     | Supported by the same model                                               |
| **Landowner joint-venture developers** | Develop on a landowner's land and share flats/revenue | **P2** (MOD-JV). v1 keeps a flag so it needs no rework (§8, MOD-PROPERTY) |

**Buyer profile:** owner-managed or professionally managed Bangladeshi companies, from 1 project / 2 users to ~20 projects / 50 users. The decision-maker is the Managing Director or the Accountant.

### 2.3 Commercial model

- Sold by ExzaZone Agency as licensed software / SaaS. **There is no public sign-up**: companies are onboarded by Super Admin (FLOW-01).
- Each company is a **tenant**, fully isolated from every other tenant.
- Deployment options per company: **Cloud-Hosted** (desktop + web clients) or **Local Standalone** (desktop only, offline) — see §11.
- Access is governed by a **license** (plan, validity, limits, status) managed in MOD-PLATFORM.

### 2.4 Product facts

|                       |                                                                                                                   |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Product name**      | ExzaEstate                                                                                                        |
| **Market**            | Bangladesh                                                                                                        |
| **Currency**          | BDT / ৳ only (v1 has no multi-currency ledger; see MOD-CUSTOMER for NRB foreign-remittance notes)                 |
| **Timezone**          | Asia/Dhaka for all business dates and cut-offs                                                                    |
| **UI language**       | English only (`en.json`)                                                                                          |
| **Document language** | English by default; **Bangla templates for receipts, quotations, agreements and SMS are P1** (company-selectable) |
| **Accounting model**  | Double-entry (mandatory)                                                                                          |
| **Clients**           | Desktop (Dual Mode, built first), Web (built second)                                                              |
| **Architecture goal** | API-first, multi-tenant, secure, auditable, scalable                                                              |

---

## 3. Problem Statement

Real estate businesses in Bangladesh typically manage land, projects, inventory, bookings, installment collection, expenses and accounting across registers, Excel and disconnected software. This causes:

- Duplicate data entry and calculation errors.
- **The same property being booked or sold to two customers.**
- Poor tracking of customer-wise dues and overdue installments.
- Unauthorized or inconsistent discounts.
- Mismatch between cash collected and what accounts show.
- Slow, unreliable management reports (sales, collection, profitability).
- No audit trail — records can be silently edited or deleted.
- No clean way to start: existing companies have running bookings and part-paid installments that must come into the new system.

---

## 4. Goals, Success Metrics and Non-Goals

### 4.1 Goals

1. Enter once, propagate everywhere.
2. **A property can never have more than one active booking** (DB constraint + application logic).
3. Accurate real-time customer receivable and overdue tracking.
4. Every payment automatically flows into a **balanced double-entry ledger**.
5. Project-wise income, cost and profitability visibility.
6. Enforced approvals for discounts, refunds, cancellations, waivers and large expenses.
7. Immutable financial records with a full audit trail; corrections by reversal, never edit/delete.
8. A real-time dashboard whose numbers always equal the reports.
9. All business rules configurable, never hard-coded.
10. One backend powering desktop then web without rebuilding business logic.
11. **An existing company can go live mid-flight** (opening balances + running bookings) without re-keying history by hand beyond a guided wizard.

### 4.2 Measurable success targets (business outcomes, tracked after launch)

| Outcome                                                                   | Target                               |
| ------------------------------------------------------------------------- | ------------------------------------ |
| Time to issue a money receipt (open customer → printed receipt)           | ≤ 2 minutes for a trained Accountant |
| Time to create a booking from an existing quotation                       | ≤ 5 minutes                          |
| Month-end: period closed after last transaction                           | ≤ 1 working day                      |
| Customer statement vs AR ledger difference                                | **৳0.00**, always (AT-14)            |
| Duplicate active bookings per property                                    | **0**, always                        |
| Accountant reconciles daily collection (cash/bank book vs receipts)       | ≤ 15 minutes per day                 |
| Onboarding of a new tenant (Super Admin action to first login)            | ≤ 30 minutes                         |
| Go-live for a company with ≤ 300 running bookings (using migration tools) | ≤ 3 working days                     |

### 4.3 Non-goals (explicitly OUT of scope for v1 / v1.x unless a later PRD version says otherwise)

- Payroll, salary, leave and attendance (the Employee module is a profile + hierarchy record only).
- Customer-facing portal or mobile app for customers; broker portal.
- Real payment-gateway / bKash / Nagad **API integrations** (these are recorded as payment _methods_ with transaction references; "Gateway" is a label only).
- Multi-currency accounting and foreign-exchange revaluation.
- Bangla UI (only Bangla _document templates_ in P1).
- Material stock / warehouse inventory management (goods receipt records quantities for bills only).
- Asset depreciation posting (register only; depreciation is P2).
- Automatic bank-statement import / auto-reconciliation.
- Third-party data migration beyond the CSV templates defined in MOD-MIGRATION.
- Tax filing/returns (VAT/TDS are _recorded_ via configurable rates; no return submission).
- Two-way sync between Local Standalone and Cloud (migration is one-way, §11).

---

## 5. Users and Roles

ExzaEstate ships **5 core roles** (including Super Admin). Additional **custom roles** can be created per company with granular permissions. The exact grid is `permissions-matrix.md`; this section states intent.

### 5.1 Role definitions

| Role                                     | Responsibility                                                                                                                                                                                                | Typical data scope   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **Super Admin**                          | Platform management by ExzaZone Agency: tenant onboarding, license keys, subscription status, system health. **No access to any tenant's business data.**                                                     | n/a (platform level) |
| **Managing Director (MD)** — Owner/Admin | Full company administration, branches, users, master data, high-level approvals, settings, KPI and financial overview. Also called "Director" in conversation; the system role name is **Managing Director**. | ALL                  |
| **General Manager (GM)**                 | Sales pipeline, collection performance, project progress, expense verification, operational approvals.                                                                                                        | ALL or BRANCH        |
| **Accountant**                           | Collections, money receipts, cash/bank, expense vouchers, vendor bills, journals, trial balance, financial reports. Posts payments.                                                                           | ALL or BRANCH        |
| **Executive (Sales & Site)**             | CRM leads, follow-ups, quotation drafting, booking requests, inventory browsing, site progress updates. In conversation "Sales Executive" means this role.                                                    | OWN (default)        |

### 5.2 Data scope

Every role→permission grant carries a **scope**: `OWN` (records the user created or is assigned to), `TEAM` (own + records of employees in the user's supervisor subtree), `BRANCH` (all records of the user's branches), `ALL` (whole company). Scope is enforced server-side in queries, global search and exports.

### 5.3 Permissions are action-level

View, Create, Edit, Delete, Approve, Reject, Cancel, Refund, Reverse, Post, Lock, Export, Print, Manage Settings, View Sensitive, plus view-scope variants. They are enforced at the **API level** (`architecture.md` ARCH-RBAC). Hiding a menu item on either frontend is never sufficient (BR-10).

### 5.4 Key intent per role (the grid must agree with this)

| Action                                                | Executive                       | Accountant                        | GM                           | MD                              |
| ----------------------------------------------------- | ------------------------------- | --------------------------------- | ---------------------------- | ------------------------------- |
| Create lead / follow-up / quotation / booking request | Yes (OWN)                       | No                                | Yes                          | Yes                             |
| Create **draft** payment                              | Yes (booking amount draft only) | Yes                               | Yes                          | Yes                             |
| **Post** payment / issue receipt                      | **No**                          | **Yes**                           | Optional                     | Yes                             |
| Approve discount                                      | No                              | No                                | Tier 1–2                     | Tier 1–3                        |
| View full general ledger / trial balance              | No                              | Yes                               | Yes                          | Yes                             |
| Process refund payment                                | No                              | Yes (after approval)              | No                           | Yes (after approval)            |
| Approve refund / cancellation                         | No                              | No                                | Yes (up to configured limit) | Yes                             |
| Post / reverse journals                               | No                              | Yes (reverse needs approval rule) | No                           | Yes                             |
| Close / reopen fiscal period                          | No                              | Close: Yes · Reopen: **No**       | No                           | Yes                             |
| Change permissions / roles / settings                 | No                              | No                                | No                           | **Only MD**                     |
| Property status manual override                       | No                              | No                                | No                           | Yes (reason mandatory, audited) |

### 5.5 Tenancy of users

In v1 a user belongs to **exactly one company** (a person working for two companies has two accounts). A user may be assigned to one or more **branches**. The header has a **branch switcher** (a view filter over allowed branches), not a company switcher.

### 5.6 Approval authority and the single-user rule (resolves "MD bypass")

Approvals are never _skipped_; they are either **granted by a person** or **auto-granted with a full record**.

- **Self-approval is blocked** for everyone on sensitive transactions (BR-05, MOD-APPROVAL).
- **Single-user auto-approval** (`single_user_auto_approve`): when the company has exactly **one active user** (typical of Standalone), or the setting is enabled, an approval request raised by that user is auto-approved. The system still creates the approval record with status `AUTO_APPROVED`, `approver = requester`, `auto = true`, and writes the audit entry. Reports and the audit log mark such approvals.
- **MD self-approval in multi-user companies** is controlled by `allow_md_self_approval` (default **false**). If enabled, it is audit-flagged in the same way.
- Higher tier permission covers lower tiers (an MD can approve tier 1–3).

---

## 6. Core Design Principles

- **Single Source of Truth** — data created once, reused system-wide, by both frontends.
- **Accounting Integrity** — every posted transaction has Total Debit = Total Credit.
- **No Duplicate Booking** — one active booking per property, DB-enforced (`architecture.md` RULE-BOOKING-RACE).
- **Auditability** — who, what, when, old value, new value for every sensitive change (`architecture.md` ARCH-AUDIT).
- **Immutability** — posted/locked financial records (journals, payments, receipts) are never edited or hard-deleted; corrections are reversal + new entry (`architecture.md` RULE-IMMUTABLE).
- **Configuration over hard-coding** — tax/VAT, discount limits, approval matrices, numbering, fiscal year, policies, templates.
- **Flexible deployment** — Desktop **Dual Mode** (Cloud-Hosted or Local Standalone, `architecture.md` ARCH-DESKTOP-MODE) and Web (Cloud). Same business logic, validations and accounting rules in every mode.
- **Permission by action**, not by menu visibility.
- **Multi-tenant from day one**, even if early usage is a single company.
- **Bangladesh localization** — land units, BDT lakh/crore grouping, Asia/Dhaka, Bangladesh-specific fields.
- **Nothing silent** — missing accounting mappings, closed periods, unauthorized actions and validation failures are **blocked with a clear message**, never skipped.

---

## 7. End-to-End Business Flows (step by step)

Each flow lists the **actor**, the **steps**, and the **system effects**. "Same transaction" means one database transaction that fully succeeds or fully rolls back. Technical realisation is in `architecture.md`; exact debit/credit lines are in `accounting-rules.md`.

### FLOW-01 — Tenant onboarding (Super Admin) · P0

1. Super Admin creates a **company (tenant)** record: legal name, trade name, address, contact, plan.
2. Super Admin creates the company's first **Managing Director** user (email, name, temporary credential / invitation).
3. System, in one transaction, **seeds** for the new company: default real-estate Chart of Accounts, accounting event mappings (`accounting-rules.md`), default roles and permissions, default numbering patterns, default settings (§17), default fiscal year (July–June, configurable), notification templates, default approval rules (MOD-DISCOUNT, MOD-APPROVAL).
4. Super Admin generates and assigns a **license** (plan, valid-from/to, limits, status `ACTIVE`).
5. MD receives the invitation, sets password, enables 2FA (required for MD), and starts FLOW-02.
6. Audit entries are written for every step. Super Admin never sees the company's business data afterwards.

### FLOW-02 — Company first-time setup (MD wizard) · P0

1. Company profile: logo, address, contact, TIN/BIN (optional), receipt footer text.
2. Fiscal year and accounting periods (monthly periods generated).
3. Branches (at least one "Head Office").
4. Review **policy settings**: land-unit factors (confirm local Bigha standard), revenue recognition, minimum booking %, cancellation deduction %, late-fee, reservation hold time, discount tiers, approval thresholds, numbering patterns (⚠ OWNER-CONFIRM items flagged in §20).
5. Create users and assign roles/branches/scope; supervisors mapped (for TEAM scope and approval hierarchy).
6. Review/adjust Chart of Accounts; create cash and bank accounts; (optional) enter opening balances through FLOW-03.
7. Create master data: lead sources, property types, charge types, payment plan templates, expense categories.
8. System shows a **setup checklist** with completion status; the company can transact once mandatory items (fiscal year, branch, COA mapping, one cash/bank account) are done.

### FLOW-03 — Go-live migration for an existing business · P0 (manual) / P1 (CSV)

Purpose: a company that already has bookings and part-paid installments starts in the middle of its life.

1. MD/Accountant sets the **go-live date** (cut-over date). Postings before it are blocked once migration is finalized.
2. **Opening balances:** Accountant enters opening balances for balance-sheet accounts (cash, bank, receivable control, payables, equity, advances, etc.). The system creates a single **Opening Balance journal** of type `OPENING`; it MUST balance.
3. **Legacy bookings:** for each running booking the user enters (or CSV-imports, P1): customer, property, booking date, net price, agreed payment schedule, every payment received so far (date, amount, method, **old receipt number**), and remaining installments.
4. System creates: the booking (status set to the real current state, flagged `legacy = true`), installments (paid ones `Paid` with allocations), legacy receipts (flagged `LEGACY`, carrying the old receipt number). It does **not** post new revenue/cash journals for history — the opening balance journal already carries them.
5. **Reconciliation gate (blocking):** for the whole company, `Σ outstanding of all legacy bookings` MUST equal the opening Accounts Receivable balance (per account mapping). Differences are listed per customer. The wizard cannot be finalized until the difference is **৳0.00** or the Accountant documents an approved adjustment (approval rule, audited).
6. Finalize: migration is locked; legacy bookings behave like normal bookings from the go-live date forward (collections, statements, aging, reports).

### FLOW-04 — Land → Project → Inventory setup · P0

1. Create **Land** records (owner, location, dag/khatian/deed, area in local unit, purchase and legal cost, mutation status, GPS); attach documents with expiry dates.
2. Create **Project** (code, name, type, location, linked land, project manager, dates, status); the system creates the project's **cost center**.
3. Define the hierarchy: **Block/Zone → Road/Floor → Unit** (plot, flat, shop, office, parking). Bulk-create units from a pattern (e.g., Floors 1–10 × Units A–D).
4. Per unit: size (stored in sq ft), facing, base price, premium, **discount limit %**, net price (computed), `owner_type` (default `COMPANY`; `LANDOWNER` reserved for MOD-JV).
5. Publish: units start as `Available`. Land purchase costs are posted via the Expense/Journal flow to the project cost center.

### FLOW-05 — Lead → Customer · P0

1. Lead captured (source, contact, interest). **Duplicate check** on phone/email warns before saving.
2. Executive logs **follow-ups** (call, SMS, email, meeting, site visit, WhatsApp) with due dates; overdue ones highlight; reminders via MOD-NOTIFY.
3. Lead moves through the pipeline `New → Contacted → Interested → Qualified → Site Visit → Negotiation → Booking → Customer`, or `Lost` (reason mandatory) at any stage.
4. On conversion the system creates the **Customer** (individual or company), copying lead data and keeping the lead history linked.

### FLOW-06 — Sale: quotation → booking → confirmation · P0 (the central flow)

1. Executive picks a **property** (status `Available`) and customer.
2. Executive creates a **quotation**: price breakdown (`base + premium − discount + charges = net`), chosen **payment plan** (from template, adjustable before confirmation), validity date. The system generates a quotation number and PDF.
3. **Discount check:** if discount % > `free_discount_limit_pct` (default 0) or exceeds the property's `discount_limit`, the quotation requires approval via MOD-APPROVAL using the tier matrix (MOD-DISCOUNT). It cannot convert to a booking until approved.
4. Executive converts the quotation to a **booking request**. System validates, in one transaction with a row lock on the property: property is `Available`; customer valid; pricing equals quotation; discount within approved limit; payment plan present; required documents present (if configured); **no other active booking**; user permission; fiscal period open.
5. On success: booking `REQUESTED` (or `PENDING_APPROVAL` if any approval is open); property becomes `Reserved`. The call is **idempotent** (`Idempotency-Key`, `architecture.md` ARCH-IDEMPOTENCY).
6. A **reservation hold timer** starts (`reservation_hold_hours`, default 72). If the booking amount is not posted before it expires, the system **auto-cancels** the booking (reason `EXPIRED`, system actor), releases the property to `Available`, notifies the Executive, and audits it. Bookings in `PENDING_APPROVAL` do not expire but escalate after `approval_sla_hours` (default 24).
7. The customer pays the **booking amount**. Executive (or Accountant) records a **draft payment** (`payment:create-draft`); the **Accountant posts** it (FLOW-07 steps 4–8). Minimum booking amount = `min_booking_pct` of net price (default 10 %).
8. **Confirmation rule:** booking becomes `CONFIRMED` automatically in the same transaction as the posting of the payment that makes the total posted booking-amount allocation ≥ the required minimum **and** no approval is pending. (A cheque counts only when Cleared — see FLOW-07.)
9. In the same transaction as confirmation the system: sets property `Booked`; generates the **installment schedule** from the plan; creates the **receivable**; creates the **accounting event → journal** per `revenue_recognition` setting; issues the **receipt** for the posted payment; writes audit entries; updates dashboard aggregates.
10. If any step fails (e.g., missing accounting mapping, closed period) the **whole transaction rolls back** and the user sees a precise reason (BR-06).
11. Executive/GM generates the **agreement** (FLOW-08).

### FLOW-07 — Collection: installments, payments, receipts · P0

1. Each night (Asia/Dhaka) a scheduled job refreshes installment timing states and sends reminders per the reminder schedule.
2. Customer pays by Cash / Bank / Cheque / bKash / Nagad / Card / Gateway(label) / Other. Staff opens the customer or booking and records the payment: amount, date, method, references (cheque no./bank/branch, mobile-wallet transaction ID and sender number, card slip no.).
3. **Allocation:** the user picks an installment, accepts the default (`allocation_order`), or allocates manually (permission required). Allocation targets: booking amount, down payment, installment, late fee/penalty, adjustment, refund offset. Any excess becomes **customer advance/credit** (never lost). Unallocatable money may go only to the controlled **suspense account** and is flagged on the dashboard.
4. **Posting** (Accountant): validates fiscal period open, allocation totals = payment amount, accounting mapping exists; creates the journal; payment status `Posted`.
5. Posting **issues the receipt** (unique number, branding, references, amount, method, previous due, current due, collector) and PDF.
6. **Cheques:** a cheque payment is `Received` with cheque sub-status `Pending`; a printable _acknowledgement_ (not a receipt) can be given. Accounting, allocation and receipt happen only when the cheque is marked **Cleared** (`cheque_post_on = CLEARED`). If **Bounced**, nothing was posted, the payment is closed as `Cancelled` with reason, and the customer is notified; if a payment was somehow already posted, a **reversal** is created (receipt is voided, not deleted).
7. **Corrections:** a wrong posted payment is **reversed** (approval per rule); the receipt is marked reversed; a new correct payment is entered. Nothing is edited or deleted.
8. Installment display state combines two things (see §9.3): the _payment state_ (Unpaid/Partially Paid/Paid/Waived/Cancelled) and the _timing state_ (Upcoming/Due Today/Overdue).

### FLOW-08 — Agreement and completion · P0

1. From a `CONFIRMED` booking, an agreement is generated from the company's agreement template (legal text supplied by the company), unique agreement number; booking → `AGREEMENT_PENDING`.
2. Signed copy is uploaded; the Accountant/GM marks the agreement **signed and locked**: booking → `AGREEMENT_COMPLETED`. Locked agreements cannot be edited; changes create a **new version**.
3. When the booking is fully paid and handover conditions per `completion_policy` (default: fully paid) are met, an authorized user marks it `COMPLETED`; property becomes `Sold`.

### FLOW-09 — Cancellation and refund · P0

1. Authorized user raises a **cancellation request** with a reason.
2. System calculates: **paid amount**, **deduction** (`cancellation_deduction_pct` of paid, default 10 %, or a policy rule), **refund = paid − deduction**, and what happens to unpaid receivables.
3. Approval via MOD-APPROVAL (cancellation and refund are separate approvable actions; never bypassed — see §5.6).
4. On approval: booking → `CANCELLED`; unpaid installments → `Cancelled`; accounting adjustment posted (sale/receivable reversal, deduction income, refund payable); property → `Available` (or `Blocked` per cancellation policy); related commission is adjusted (FLOW-14).
5. Accountant pays the **refund** (method, reference); journal posts (refund payable → cash/bank); receipt-style _refund voucher_ is issued.
6. Every step is audit-logged. A booking in `COMPLETED` cannot be cancelled in v1; it can only be transferred (FLOW-10) or corrected by approved accounting adjustment.

### FLOW-10 — Booking transfer (name transfer) · P1

1. Authorized user raises a **transfer request**: existing booking, transferee customer, transfer fee (charge type), reason, documents (deed of transfer, NOCs).
2. Approval per rule. On approval, in one transaction: the old booking → `TRANSFERRED` (inactive); a **new booking for the transferee** is created, carrying over the net price, paid amounts, allocations and remaining schedule, marked `is_transfer = true`; the property's status is derived from the new booking (so it stays `Booked`/`Sold`).
3. Receivable moves from the old customer to the new one by journal (no revenue is recognized twice); the transfer fee is posted as income.
4. Customer 360 of both customers shows the history. Reports count the property **once** (BR-14).

### FLOW-11 — Expense → payment · P0 (vouchers + approval) / P1 (budgets)

1. Staff raises an **expense request** (category, project/cost center, amount, vendor/payee, description, attachments).
2. Approval by amount/category/project thresholds via MOD-APPROVAL (default: GM verifies; above `expense_md_threshold` = ৳5,00,000 the MD approves).
3. Accounts verification, then payment from a cash/bank account; the **journal** (expense debit / cash-bank credit) posts automatically; project cost center is updated.
4. P1: budget **actual-spend** updates; alerts at 70 % (info), 85 % (warning), 100 % (critical) of budget.

### FLOW-12 — Procurement · P2

Purchase Request → Approval → Purchase Order → Goods Receive → Vendor Bill (AP, with optional TDS/VDS deduction lines) → Vendor Payment → Accounting. Vendor bills and payments themselves are **P1** (MOD-VENDOR); the request→PO→goods-receipt steps are P2.

### FLOW-13 — Month-end and period close · P0

1. Accountant reviews: unposted/draft payments, suspense balance, pending approvals, bank reconciliation status (manual tick-off of bank transactions).
2. Reports are checked: trial balance balanced; AR aging = customer statements total (AT-14).
3. Accountant **closes** the period; new postings dated in it are blocked. **Reopening** requires the MD (permission + reason; audited). Fiscal year-end close rolls net income to equity per `accounting-rules.md`.

### FLOW-14 — Broker/agent commission · P1

1. A lead/booking carries a broker (optional). Commission rule applies (e.g., 2 % of net price).
2. Commission becomes **Earned** when the booking reaches `CONFIRMED` (`commission_trigger`, default `ON_CONFIRMED`; alternatives `ON_COLLECTION_PCT`, `ON_AGREEMENT`); a payable is created (AP-style entry).
3. GM/MD **Approves**; Accountant **Pays** (journal posts).
4. If the booking is cancelled: unpaid earned commission is reversed; commission already paid creates a **broker receivable** for recovery (policy `commission_clawback`, default on).

---

## 8. Feature Modules

Each module lists its **priority**, scope, key fields, rules and states. All modules are backend modules first (Part A) and then surfaced in Desktop (Part B) and Web (Part C). Every list/search endpoint respects data scope (§5.2).

### MOD-PLATFORM — Platform, Tenants and Licensing · P0

_Used only by Super Admin. No access to tenant business data._

- **Tenants:** create, suspend, reactivate company; run FLOW-01 seeding.
- **Licenses:** key, plan, valid-from/to, limits (users, branches, projects), status `ACTIVE | SUSPENDED | EXPIRED`. Expiry behaviour: a configurable **grace period** (`license_grace_days`, default 15) with a warning banner, then **read-only mode** (viewing/exporting allowed, new postings blocked). **Data is never deleted** because of license status.
- **Subscription status** and renewal date visible to Super Admin and (read-only) to the company's MD.
- **System health:** service status, queue depth, backup status, error rates (no business data).
- **Standalone licensing:** license is a signed file with expiry verified offline; same grace rules apply (`architecture.md` ARCH-DESKTOP-MODE defines mechanics).
- ⚠ OWNER-CONFIRM: plan names, limits and pricing tiers.

### MOD-ORG — Organization · P0

Company, branch, department, user, role, permission, fiscal year. Branding (logo, address, contact) appears on receipts, quotations, agreements, statements and reports. Numbering is configurable (MOD-NUMBERING). Users are invited by email, set a password, and are subject to 2FA for privileged permissions (`security.md`). Login events are logged. Roles: the 5 core roles plus company-defined custom roles.

### MOD-LAND — Land Management · P0

Land master: name, owner(s), district, upazila, mouza, dag no, khatian no, deed no, area (user unit, stored as sq ft), purchase price, registration/legal cost, mutation/land-tax status, ownership status, GPS. A land can link to one or more projects. **Legal document management** with versioning, access control and **expiry alerts** (via MOD-NOTIFY). Land cost lines feed project cost (MOD-PROFIT).

### MOD-PROJECT — Project and Cost Center · P0

Project master (code, name, type, location, linked land, project manager, start/end dates, status, master plan, gallery). Every project has a **cost center** (Company → Project → Cost Center → transactions). Optional phases.

### MOD-PROPERTY — Property / Inventory · P0

- **Hierarchy:** Project → Block/Zone → Road/Floor → Plot/Flat/Shop/Office/Parking.
- **Fields:** code, type, size (`area_sqft`, Decimal(18,4)), facing, base price, premium, **discount limit %**, net price, status, `owner_type` (`COMPANY` default; `LANDOWNER` reserved for MOD-JV).
- **Status (final enum):** `Available`, `Hold`, `Reserved`, `Booked`, `Sold`, `Blocked`. (`Cancelled` and `Transferred` are **booking** statuses and appear only as events in the property status history — see §9.2.)
- **Critical rule (BR-01):** at most one **active** booking per property, enforced by a DB partial unique index plus a row lock (`architecture.md` RULE-BOOKING-RACE).
- Status is **derived from booking events** (mapping in §9.1). Manual override requires an elevated permission, a mandatory reason, and writes an audit entry (`architecture.md` RULE-PROPERTY-STATUS). `Hold` (management hold, optional expiry date) and `Blocked` are set only by permissioned manual action, except cancellation-to-`Blocked` per policy.
- **Land units.** Entered in the user's unit, stored canonically in **sq ft**. Default factors (editable per company because they vary by district): 1 Decimal = 435.6 sq ft; 1 Acre = 100 Decimal = 43,560 sq ft; 1 Katha = 720 sq ft; 1 Bigha = 20 Katha = 14,400 sq ft. (Some northern districts use 1 Bigha = 33 Decimal ≈ 14,375 sq ft — the company confirms its local standard at onboarding.)
- **Property status history** is recorded (who/what/when/why).

### MOD-CRM — Leads · P0

Sources: Facebook, Instagram, Google, Website, TikTok, YouTube, Referral, Broker, Walk-in, Phone, WhatsApp, Event, Other (extendable list). Duplicate phone/email detection (warn, with permission to override). Pipeline `New → Contacted → Interested → Qualified → Site Visit → Negotiation → Booking → Customer`, or `Lost` (reason mandatory). Lead source performance report. Lead owner (assignee) drives `OWN` scope.

### MOD-FOLLOWUP — Follow-ups · P0

Follow-up types: call, SMS, email, meeting, site visit, WhatsApp. Fields: due date/time, outcome, next follow-up. Overdue highlighting; reminders through MOD-NOTIFY; full history on the customer's profile.

### MOD-CUSTOMER — Customer 360 · P0

- **Customer types:** Individual, Company.
- **Identity:** name, father/spouse name, NID / passport / birth-registration no., TIN (optional), date of birth, photo, phones, email, present and permanent address, occupation, **nationality / resident status** (including **NRB** flag).
- **Joint buyers:** a booking can have multiple **co-buyers** with a **share %** (sum = 100 %). The primary buyer is the contact and statement addressee.
- **Nominee** (name, relationship, NID, photo, address) and optional **power of attorney** holder (with document).
- **Foreign remittance (NRB):** payments are recorded in BDT; optional informational fields `original_currency`, `original_amount`, `exchange_rate`, remittance reference. No foreign-currency ledger in v1.
- **Customer 360 view:** leads, bookings, properties, quotations, agreements, installments, payments, receipts, outstanding balance, advance/credit, refunds/cancellations, documents, follow-ups, communication log, audit timeline.
- **Statement:** see MOD-STATEMENT.

### MOD-QUOTATION — Quotation · P0

System number; branded PDF; price breakdown (`base + premium − discount + charges = net`) with each charge itemised; validity date; chosen payment plan; conversion path to a booking. Discount beyond the allowed limit triggers approval automatically (MOD-DISCOUNT). Expired quotations cannot convert. A quotation is a draft document; it never reserves a property.

### MOD-DISCOUNT — Discount Approval · P0

- **Base:** discount % is calculated on `base price + premium` (⚠ OWNER-CONFIRM).
- **Free allowance:** `free_discount_limit_pct` (default **0 %**): a discount at or below it needs no approval.
- **Hard ceiling:** the property's `discount_limit`. A discount above it is blocked unless an MD approves a **price exception** (tier 3, reason mandatory).
- **Default three-tier matrix** (rows of `approval_rules`, editable without a deploy):

| Discount range             | Approval permission      | Default approvers     |
| -------------------------- | ------------------------ | --------------------- |
| > free allowance up to 2 % | `discount:approve-tier1` | General Manager or MD |
| > 2 % up to 5 %            | `discount:approve-tier2` | General Manager or MD |
| > 5 %                      | `discount:approve-tier3` | MD only               |

- Tier 1 and 2 are separate rows so each company can assign different approvers/limits later. A higher-tier permission can approve lower tiers. Unauthorized discounts are blocked **by the API**. Every approval stores approver identity, discount %, amount and reason.

### MOD-BOOKING — Booking Workflow · P0

Flow: FLOW-06. Booking has its **own status machine** (§9.1). Validation before confirmation: property availability, customer validity, correct pricing, discount within approved limit, payment plan exists, required documents (if configured), no duplicate active booking, user permission, fiscal period open. Bookings are **idempotent** to create and **never hard-deleted** (cancel instead). **Reservation expiry** and **approval SLA** are defined in FLOW-06. Booking carries: customer(s), property, quotation, net price, discount + approval link, charges, payment plan, broker, sales executive, source lead, flags (`legacy`, `is_transfer`).

### MOD-AGREEMENT — Agreements · P0

Generate from a booking and an editable company **agreement template** (legal wording supplied by the company; Bangla template support is P1); unique agreement number; **lock** when signed; versioning for any change after lock; document upload via MOD-DOCS.

### MOD-CANCEL-REFUND — Cancellation and Refund · P0

Flow: FLOW-09. Configurable policy: `cancellation_deduction_pct` (default 10 % of paid) with optional rules by stage (e.g., before/after agreement) and `cancellation_property_status` (`Available` default or `Blocked`). Refunds produce proper accounting entries, require approval, and never bypass it (§5.6).

### MOD-TRANSFER — Booking Transfer · P1

Flow: FLOW-10. Transfer fee as a charge type; approval-controlled; carries over paid amounts and schedule; counts the sale once.

### MOD-PAYPLAN — Payment Plans · P0

A **payment plan template** defines how a net price is collected. Components:

1. **Booking amount** — % of net price (default `min_booking_pct` 10 %) or fixed amount; due at booking.
2. **Down payment** — optional, % or fixed, due N days after booking or on a fixed date.
3. **Installments** — count, **frequency** (`MONTHLY`, `QUARTERLY`, `HALF_YEARLY`, `YEARLY`, `CUSTOM`), first due date rule (e.g., day-of-month), **equal** or **custom amounts**.
4. **Special payments** — e.g., handover/balloon/milestone payments as % or fixed amount at a milestone or date.

Rules: components MUST sum to the net price (verified exactly); equal splits use `Money.allocate` (largest-remainder) so no paisa is lost; the schedule is generated per booking at confirmation and can be customized **before confirmation** on the quotation/booking; after confirmation, any change is a **reschedule** that needs permission, approval and audit and keeps history. Default template = booking amount + equal installments of the rest.

### MOD-CHARGES — Charge Types and Fees · P0

A catalogue of non-price charges: registration/stamp cost, utility connection, car parking, development charge, legal/deed fee, club/membership, transfer fee, late fee, other. Each has: name, calculation (`FIXED` or `% of net price`), **included in net price** or **additional**, when payable (at booking / in schedule / at handover), VAT/tax rate (default 0 %), income/liability account mapping. Charges appear itemised on quotation, booking, statement and receipt.

### MOD-INSTALLMENT — Installments · P0

Auto-generated from the payment plan. States in §9.3. Manual schedule changes need permission + audit. **Waivers require approval** and post an adjustment. **Late fee:** disabled by default (`late_fee_rate = 0`); when enabled, simple monthly % on overdue principal after an optional `late_fee_grace_days`; waivable with approval.

### MOD-PAYMENT — Payment, Allocation and Receipt · P0

- **Methods:** Cash, Bank, Cheque, bKash, Nagad, Card, Gateway (label only), Other. Method-specific reference fields (FLOW-07).
- **Payment status:** `Draft`, `Received`, `Posted`, `Cancelled`, `Reversed`. Cheque sub-status `Pending / Cleared / Bounced`.
- **Allocation:** default `allocation_order` = `BOOKING_AMOUNT → DOWNPAYMENT → LATE_FEE → INSTALLMENT_OLDEST_FIRST → CUSTOMER_ADVANCE`; user may choose a specific installment or allocate manually (permission). Partial payments supported. **Overpayment = customer advance/credit**, auto-applied to the next due installment if `auto_apply_advance` is enabled (default off, apply on user action). Unallocated money only into a controlled **suspense account** (alerted on dashboard).
- Every posted payment generates a **receipt** and an **accounting event**. Posted payments are never edited or deleted — only **reversed** (`architecture.md` RULE-IMMUTABLE).

### MOD-RECEIPT — Money Receipt · P0

Shows: company branding, unique receipt number, customer / project / property / booking references, amount (figures and words), method + references, **previous due / current due**, collector, BDT formatting, printed date. **Once issued against a posted payment, a receipt cannot be edited or deleted**: correction = reverse the payment, which **voids** the receipt (clearly marked) and a new payment issues a new receipt. PDF export; reprint is allowed and logged (marked "Duplicate copy"). Legacy receipts keep the old number (`LEGACY` flag).

### MOD-STATEMENT — Customer Statement · P0

`Opening Balance + Sales/Charges − Payments − Adjustments = Outstanding Balance`; date-range filter; PDF export; includes advance/credit. **MUST equal the AR ledger balance for that customer at all times** (AT-14).

### MOD-AGING — Due, Overdue and Reminders · P0

Buckets: `1–7`, `8–30`, `31–60`, `61–90`, `90+` days overdue. Configurable reminder schedule (default: 7 and 3 days before due, on due date, 3/7/30 days after) via MOD-NOTIFY (in-app P0; SMS/Email P1; WhatsApp P2). Collection dashboard: today's due, overdue, expected collection this week/month.

### MOD-ACCOUNTING — Double-Entry Core · P0

Every posted transaction has **Total Debit = Total Credit**, enforced in the same DB transaction that persists it; unbalanced journals never post. Posted journals are immutable; fix by reversing entry + new entry. Every business transaction is traceable to its journal and back. The ledger is a **query over journal lines**, never a separate editable table.

### MOD-COA — Chart of Accounts · P0

Assets, Liabilities, Equity, Income, Expense; parent–child hierarchy; unique codes per company; mapping to system events; inactive accounts cannot take new postings. Default real-estate COA seeded at onboarding (`accounting-rules.md`).

### MOD-EVENTS — Accounting Event Engine · P0

Business events trigger configurable postings: booking confirmed, payment posted, payment reversed, cheque cleared, expense approved/paid, vendor bill posted, vendor payment, refund, cancellation deduction, installment waiver, late fee charged, commission earned/paid, transfer, advance applied, opening balance, etc. **If a required mapping is missing the transaction is blocked**, never silently skipped (BR-06).

**Revenue recognition** (`revenue_recognition`, ⚠ OWNER-CONFIRM with the company's chartered accountant — treatment under BFRS 15 may require deferral):

- `ON_BOOKING` _(default for development)_ — at `CONFIRMED`: receivable and sales revenue for the net price; payments reduce the receivable.
- `ON_AGREEMENT` — revenue when the agreement is completed; before that, payments sit as **customer advances** (liability).
- `ON_HANDOVER` — revenue at `COMPLETED`; before that, customer advances.
  Exact debit/credit templates for each mode live in `accounting-rules.md`. Acceptance tests exist for the default and for one alternative mode (AT-04, AT-04b).

### MOD-JOURNAL — Journal and Ledger · P0

Multi-line journals: account, cost center, project, party reference. Lifecycle `Draft → Review → Posted → Locked`, plus a separate **Reverse → Correct** flow. Journal types include `GENERAL`, `OPENING`, `SYSTEM` (event-generated), `REVERSAL`. Ledger updates only on posting. Manual journals require the posting permission and, above `manual_journal_approval_threshold`, an approval.

### MOD-CASHBANK — Cash and Bank · P0

Cash and bank accounts, opening/closing balances, **transfers** between accounts (always a balanced entry), cheque tracking, manual **bank reconciliation tick-off** (no statement import in v1), cash book and bank book.

### MOD-ARAP — Receivable and Payable · P0 (AR) / P1 (AP)

**AR** is created at booking/charge posting and reduced by payments; the aging report must equal the customer statements in total. **AP** is created from vendor bills and commission payables and reduced by vendor payments, with vendor ledger and aging.

### MOD-EXPENSE — Expense and Budget · P0 (vouchers) / P1 (budgets)

Flow: FLOW-11. Expense categories; vouchers with attachments; approval thresholds configurable by amount/category/project; automatic journal; project cost-center posting. **Budgets** (P1) per category/project with alerts at 70/85/100 %.

### MOD-VENDOR — Vendor and Procurement · P1 (vendors, bills, payments) / P2 (PR → PO → GRN)

Vendor master (tax ids, bank details, documents); vendor bills with optional **TDS/VDS withholding lines** (`vendor_withholding_enabled`, default off); vendor payments with approval; P2 adds Purchase Request → Approval → PO → Goods Receive.

### MOD-DEV — Project Development Management · P2

Development tasks (land filling, roads, drainage, electricity, water, boundary, construction): budget vs actual per task, progress %, contractor tracking, linked to the project's cost center.

### MOD-MAINT — Maintenance · P2

Request → Assign → Inspection → Estimate → Approval → Work → Cost → Complete, linked to property/project/customer; approved cost flows to expense/project cost.

### MOD-ASSET — Assets · P2

Asset register: cost, location, responsible person, warranty, approval-controlled disposal. Depreciation is out of scope until a later version.

### MOD-EMPLOYEE — Employee · P1

Employee profile linked to a system user; **supervisor mapping** (drives TEAM scope and approval hierarchy); designation; sales-performance mapping. No payroll.

### MOD-COMMISSION — Commission and Broker · P1

Broker master; commission rules (`% of net price`, fixed, or `% of collected`); lifecycle `Earned → Approved → Paid` (+ `Reversed`); trigger and clawback per FLOW-14; commission payable is an AP-style entry; broker lead/sale traceability and broker performance report.

### MOD-JV — Landowner Joint Venture · P2

Landowner agreements: landowner(s), share basis (**number of units**, **area share**, or **revenue %**), the specific units allocated to the landowner (`owner_type = LANDOWNER`), cost treatment, landowner statement. Accounting rules to be supplied by the chartered accountant before build. Until released, `owner_type` stays `COMPANY` and nothing else depends on it.

### MOD-DOCS — Documents and Versioning · P0

**Standalone backend module** (`documents/`). Secure upload (presigned flow, `architecture.md` ARCH-STORAGE), versions, per-document permissions, private storage for sensitive files, attachable to almost every entity (land, project, property, customer, vendor, employee, booking, agreement, payment, expense, procurement, maintenance, asset). Expiry dates supported.

### MOD-NOTIFY — Notification Engine · P0 (in-app) / P1 (SMS, email) / P2 (WhatsApp)

**Standalone module** (`notifications/`) turning events into templated notifications: follow-up reminders, installment due/overdue, approval pending/completed, expense/budget alerts, document expiry, cheque clearance, reservation expiry. Channels: in-app, email, SMS, WhatsApp (future). Delivered via the `notifications` queue (`architecture.md` ARCH-EVENTS) with delivery logs and retry-on-failure. Templates are editable per company; SMS/email provider credentials are company settings.

### MOD-APPROVAL — Approval Engine · P0

**Standalone, generic, configurable module** (`approvals/`). Every approvable action registers against it with a rule (by amount / role / project / branch / transaction type): discount, price exception, booking, cancellation, refund, installment waiver, schedule change, expense, vendor payment, journal posting/reversal, payment reversal, budget overrun, commission payment, booking transfer, migration adjustment. Features: single or multi-step approvals, `approval_rules` table, SLA/escalation reminders, full history, **self-approval prevention** and the **auto-approve record** rules of §5.6. Approver and requester, time, decision and comment are stored for each step.

### MOD-AUDIT — Audit Log · P0

**Standalone module** (`audit/`, query side) over `audit_logs`, written **synchronously in the same transaction** as the change (`architecture.md` ARCH-AUDIT). Each entry: actor, module, record type/ID, action, old value, new value, timestamp (Asia/Dhaka), IP/device where available. Searchable by record, user, date range, action. The audit log itself is append-only.

### MOD-NUMBERING — Numbering Controls · P0

Configurable, gap-free-as-practical sequential numbers per document type: lead, customer, quotation, booking, agreement, receipt, payment, journal voucher, expense voucher, PO, vendor bill, refund, commission payment. Pattern tokens: `PREFIX`, `BRANCH`, `PROJECT`, `YEAR`, `SEQUENCE` (e.g., `RCPT-DHK-2026-000001`). Sequence reset rule (never / yearly / fiscal-yearly) configurable. Numbers are never reused.

### MOD-PERIOD — Financial Period Controls · P0

Configurable fiscal year (default July–June), monthly period close, closed periods block postings, permission-gated reopen with reason (BR-08).

### MOD-DASH — Dashboards and KPIs · P0

Real-time KPI cards and actionable lists. **Every KPI is defined in §18** and is computed by the **same backend calculation** as the matching report, consumed identically by Desktop and Web. Dashboards respect data scope.

### MOD-REPORTS — Reports · P0 (core) / P1 (full)

All reports are filterable, exportable (PDF / Excel / CSV), generated **backend-side** (`report-export` queue, `architecture.md` ARCH-EVENTS) so both clients get identical output.

- **P0 core:** Trial Balance, General Ledger, Cash Book, Bank Book, AR Aging, Customer Statement, Collection, Due/Overdue, Booking, Inventory/Property Status, Project Sales, Profit & Loss, Balance Sheet, Journal Register, Audit Trail.
- **P1 full:** Cash Flow, AP, Expense, Income, Installment, Cancellation, Refund, Project Profitability, Sales/Collection Performance, Budget vs Actual, Lead Source, Broker Performance, Commission, Customer (list).
- **P2:** Marketing ROI.

### MOD-SEARCH — Global Search · P0

Search across customer, lead, booking, property, payment, receipt, voucher, document, vendor, project. Results respect the requester's permissions and data scope. Search by phone, name, booking no., receipt no., property code.

### MOD-PROFIT — Project Profitability · P1

`Total Project Cost = Land + Development + Construction + Marketing + Admin + Other`; `Project Profit = Total Revenue − Total Project Cost`. Computed from accounting / cost-center data; budget vs actual; flags profitable vs loss-making projects. Shared administrative cost is allocated by configurable % (default: none).

### MOD-LOCALE — Bangladesh Localization · P0

Land units (Decimal, Katha, Bigha, Acre) and fields (Mouza, Dag, Khatian, Deed, Mutation, Land Tax); BDT with **lakh/crore grouping** and English digits through **one shared formatter** (`৳5,00,000`, never `500,000`); amount in words (English, lakh/crore wording; Bangla words P1); Asia/Dhaka timezone; English UI; Bangla document templates P1; tax/VAT configurable.

### MOD-MIGRATION — Go-Live Migration · P0 (manual) / P1 (CSV)

Flow: FLOW-03. Components: go-live date, opening-balance journal, legacy booking entry (with historical payments and old receipt numbers), reconciliation gate, CSV templates and validation report (P1), lock on finalize. Also covers the **Local → Cloud one-click migration** described in §11.

---

## 9. Status Machines (single source of truth)

### 9.1 Booking status

Booking has its **own** status, separate from property status.

| Booking status        | Meaning                                                                               | Active? | Property status while in this state                        |
| --------------------- | ------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------- |
| `REQUESTED`           | Request submitted, validation passed, awaiting booking amount (and/or approval grant) | yes     | `Reserved`                                                 |
| `PENDING_APPROVAL`    | An approval (discount / price exception / other) is open                              | yes     | `Reserved`                                                 |
| `CONFIRMED`           | Approvals clear **and** minimum booking amount posted                                 | yes     | `Booked`                                                   |
| `AGREEMENT_PENDING`   | Agreement generated, not yet signed                                                   | yes     | `Booked`                                                   |
| `AGREEMENT_COMPLETED` | Agreement signed and locked                                                           | yes     | `Booked`                                                   |
| `COMPLETED`           | Sale completed per `completion_policy` (default: fully paid)                          | yes     | `Sold`                                                     |
| `CANCELLED`           | Cancelled (refund flow may follow)                                                    | **no**  | `Available` or `Blocked` per cancellation policy           |
| `TRANSFERRED`         | Ownership moved to another customer (name transfer)                                   | **no**  | derived from the successor booking (stays `Booked`/`Sold`) |

**Allowed transitions** (anything else is rejected):
`REQUESTED → PENDING_APPROVAL | CONFIRMED | CANCELLED`;
`PENDING_APPROVAL → REQUESTED | CONFIRMED | CANCELLED` (`→ REQUESTED` when approval is granted but the booking amount is still unpaid; `→ CONFIRMED` when approval is granted and the amount is already posted);
`CONFIRMED → AGREEMENT_PENDING | CANCELLED`;
`AGREEMENT_PENDING → AGREEMENT_COMPLETED | CANCELLED`;
`AGREEMENT_COMPLETED → COMPLETED | CANCELLED | TRANSFERRED`;
`COMPLETED → TRANSFERRED`.

`Hold` and `Blocked` property statuses are set only by permissioned manual action (audited), plus cancellation-to-`Blocked`. The database **partial unique index covers exactly the six active statuses**: `REQUESTED, PENDING_APPROVAL, CONFIRMED, AGREEMENT_PENDING, AGREEMENT_COMPLETED, COMPLETED`. In a name transfer the old booking is set to `TRANSFERRED` **before** the successor booking is inserted, in the same transaction.

### 9.2 Property status

`Available`, `Hold`, `Reserved`, `Booked`, `Sold`, `Blocked`. Derived from booking events per §9.1. `Hold` = management hold (not tied to any booking, optional expiry date). `Reserved` = system-set while a booking is `REQUESTED`/`PENDING_APPROVAL`. **Changes from PRD v1.0:** `Cancelled` and `Transferred` are no longer property statuses — they are booking statuses and appear as history events (this removes a contradiction; `architecture.md` must be aligned, §22).

### 9.3 Installment state (two independent parts)

| Part              | Values                                                    | How it is set                                                              |
| ----------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Payment state** | `Unpaid`, `Partially Paid`, `Paid`, `Waived`, `Cancelled` | From allocations, waiver approval, booking cancellation                    |
| **Timing state**  | `Upcoming`, `Due Today`, `Overdue`                        | Derived from due date vs today (Asia/Dhaka), refreshed nightly and on read |

UI and API show the combination, e.g. "Partially Paid · Overdue 12 days". `Paid`, `Waived`, `Cancelled` are terminal and carry no timing state. A ৳3,00,000 installment with ৳1,00,000 paid before its due date is `Partially Paid · Upcoming`, remaining ৳2,00,000.

### 9.4 Payment and cheque status

`Draft → Received → Posted → Reversed`; `Draft | Received → Cancelled`. Cheque: sub-status `Pending → Cleared` (payment then auto-posts) or `Pending → Bounced` (payment → `Cancelled`, with reason). Posted payments only move to `Reversed` (via approved reversal).

### 9.5 Other lifecycles

| Entity            | Statuses                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------- |
| Lead              | `New, Contacted, Interested, Qualified, Site Visit, Negotiation, Booking, Customer, Lost` |
| Quotation         | `Draft, Pending Approval, Approved, Sent, Converted, Expired, Rejected`                   |
| Approval request  | `PENDING, APPROVED, REJECTED, AUTO_APPROVED, CANCELLED, EXPIRED`                          |
| Journal           | `Draft → Review → Posted → Locked`; `Posted → Reversed` (by reversal journal)             |
| Expense           | `Draft, Submitted, Approved, Verified, Paid, Rejected, Cancelled`                         |
| Agreement         | `Draft, Generated, Signed & Locked, Superseded`                                           |
| Commission        | `Earned → Approved → Paid`; `Reversed`                                                    |
| Refund            | `Requested, Approved, Paid, Rejected`                                                     |
| License           | `ACTIVE, SUSPENDED, EXPIRED` (+ grace / read-only behaviour)                              |
| Accounting period | `Open, Closed` (reopen creates an audit entry)                                            |

---

## 10. Money, Numbers and Dates

- **Money** is stored as exact decimal (no floating point), BDT, 2 decimal places. One shared `Money` type; **all splitting uses `Money.allocate` (largest-remainder)** so parts always sum exactly to the whole (e.g., ৳1,00,000.00 ÷ 3 = 33,333.34 + 33,333.33 + 33,333.33).
- **Percentages** are stored as exact decimals; rounding mode is half-up at the final monetary step only.
- **Formatting:** one shared formatter → `৳5,00,000` (lakh/crore grouping, English digits). Never `500,000`.
- **Area:** stored in sq ft `Decimal(18,4)`; displayed in the user's chosen unit using the company's conversion factors.
- **Dates:** business dates are Asia/Dhaka calendar dates; timestamps stored in UTC and shown in Asia/Dhaka. Nightly jobs run at a configurable time (default 00:30 Asia/Dhaka).
- **Document numbers** come only from MOD-NUMBERING.

---

## 11. Deployment Modes — Cloud and Local Standalone

### 11.1 Product definition

|                              | **Cloud-Hosted**                                                     | **Local Standalone**                                                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clients                      | Desktop and Web                                                      | Desktop only                                                                                                                                                                        |
| Companies                    | Many tenants                                                         | **One company** per installation                                                                                                                                                    |
| Users                        | Multi-user, concurrent, over the network                             | Local accounts on one device; no network access by other computers                                                                                                                  |
| Connectivity                 | Required                                                             | **100 % offline** for all core features                                                                                                                                             |
| Business logic               | Identical                                                            | Identical (same rules, validations, accounting)                                                                                                                                     |
| Approvals                    | Normal; `single_user_auto_approve` applies when only one active user | Same, so a one-person company is not blocked (§5.6)                                                                                                                                 |
| Notifications                | In-app, email, SMS (P1)                                              | In-app only (email/SMS optional when online and keys configured, P2)                                                                                                                |
| Reports/PDF/Excel            | Generated server-side                                                | Generated locally with identical output                                                                                                                                             |
| Backups                      | Automated, tested restores                                           | **Automatic local backup** to a user-chosen folder (default daily, keep 30), manual export/restore, and a **warning banner if no backup in 7 days** (`standalone_backup_warn_days`) |
| License                      | Platform-managed                                                     | Signed license file verified offline; grace/read-only rules as MOD-PLATFORM                                                                                                         |
| Availability/RPO/RTO targets | Apply (§12)                                                          | Do not apply; backup policy above applies instead                                                                                                                                   |

### 11.2 Local → Cloud migration (one-way)

- One-click **export snapshot** from Standalone and import into a **new cloud tenant** onboarded by Super Admin.
- Post-migration checks must show identical counts and balances: trial balance, AR per customer, inventory status, document counts (AT-34).
- After success, the local installation becomes **read-only archive**; no two-way sync and no Cloud → Standalone path in v1.

### 11.3 Risk note for the owner

Standalone is the highest-risk requirement (data safety on a single PC, support burden, divergent runtime). It is **P1 packaging** and must pass the same acceptance tests as Cloud. If scope pressure appears, defer Standalone before cutting any P0 module. Technical design: `architecture.md` ARCH-DESKTOP-MODE (see §22 for open conflicts with the locked database/queue stack).

---

## 12. Non-Functional Requirements

Detail lives in `architecture.md` (ARCH-SECURITY, ARCH-OPS) and `security.md`. Summary: HTTPS, argon2id password hashing, action-level RBAC with data scope, 2FA for privileged roles, rate limiting, strict server-side validation, private file storage, full audit logging, automated backups with **tested** restores, transaction-safe financial writes, indexed search, multi-company scale without redesign.

**Measurable targets (v1; tune after load test):**

| Metric                    | Target                                                                                                | Applies to |
| ------------------------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| Scale assumption          | up to 50 companies, 500 concurrent users total, 1M journal lines per company per year                 | Cloud      |
| API latency (server-side) | reads p95 ≤ 300 ms; writes p95 ≤ 500 ms; cached dashboard KPIs p95 ≤ 800 ms                           | Cloud      |
| List screens              | first page ≤ 1 s on LAN; tables > 100 rows virtualized                                                | Both       |
| Interactive reports       | ≤ 3 s p95                                                                                             | Both       |
| PDF/Excel exports         | async; ≤ 60 s for 10k rows                                                                            | Both       |
| Availability              | 99.5 % monthly (business hours weighted)                                                              | Cloud      |
| RPO / RTO                 | RPO ≤ 5 min, RTO ≤ 4 h                                                                                | Cloud      |
| Desktop cold start        | ≤ 3 s to login screen on a mid-range laptop                                                           | Desktop    |
| Accessibility & usability | Keyboard-operable data entry; every destructive/financial action shows a confirmation with the amount | Both       |

---

## 13. Technology (locked; details in `architecture.md`)

| Layer                                 | Locked choice                                                                                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Backend                               | **NestJS 12** (Node.js 24 LTS, TypeScript 7.0.2) — the one and only backend                                       |
| ORM                                   | **Prisma 7** (driver adapter)                                                                                     |
| Database                              | **PostgreSQL 18**                                                                                                 |
| Cache / Queues                        | **Redis 8** + **BullMQ 6**                                                                                        |
| File storage                          | S3-compatible object storage                                                                                      |
| Auth                                  | JWT access + rotating refresh token; RBAC with data scope                                                         |
| Desktop client (Part B)               | **Tauri 2 + Vite 8 + React 19 + TypeScript 7**, sharing `packages/ui`, `packages/features`, `packages/api-client` |
| Web client (Part C)                   | **Vite 8 + React 19 SPA + React Router 8** (no Next.js)                                                           |
| Monorepo                              | pnpm 12 workspaces + Turborepo 2                                                                                  |
| Libraries (PDF, Excel, charts, dates) | Fixed in `architecture.md` ARCH-LIBS — agents must not add alternatives                                           |

Versions are pinned by major in `architecture.md` ARCH-VERSIONS and recorded in `agent/tech-versions.md`. There is no alternative stack. If a task seems to require deviating, **flag it instead of substituting**. Where product requirements here (Standalone, Bangla PDF fonts, nightly jobs) need a technical answer that the locked stack does not obviously provide, `architecture.md` must resolve it (§22).

---

## 14. Core Data Entities (product-level list; schema in `architecture.md`)

- **Platform:** tenants (companies), licenses, subscriptions, platform_audit_logs
- **Organization:** companies, branches, departments, users, user_roles, roles, role_permissions (with `scope`), permissions, fiscal_years, accounting_periods, company_settings, refresh_tokens, invitations, login_logs
- **Land:** lands, land_documents, land_owners, land_costs
- **Project:** projects, project_phases, cost_centers, project_documents
- **Property:** properties (with `owner_type`), property_types, blocks, roads, property_status_history
- **CRM:** leads, lead_sources, lead_followups, customers, customer_contacts, customer_parties (co-buyers with share %), customer_nominees
- **Sales:** quotations, quotation_items, bookings (with `legacy`, `is_transfer`, `expires_at`), booking_status_history, payment_plan_templates, payment_plan_components, payment_plans, charge_types, booking_charges, agreements, agreement_versions, cancellations, refunds, booking_transfers
- **Collection:** installments, payments, payment_allocations, receipts, reminders, customer_advances
- **Accounting:** chart_of_accounts, journals, journal_lines, journal_reversals, posting_rules, accounting_events, opening_balance_batches
- **Cash/Bank:** cash_accounts, bank_accounts, bank_transactions
- **Expense:** expense_categories, expenses, budgets
- **Procurement:** vendors, purchase_requests, purchase_orders, goods_receipts, vendor_bills, vendor_payments
- **Development (P2):** development_tasks, contractors, project_costs
- **Maintenance (P2):** maintenance_requests, maintenance_tasks
- **Assets (P2):** assets, asset_categories, depreciations
- **Employee:** employees, designations
- **Commission:** brokers, commission_rules, commissions, commission_payments
- **JV (P2):** landowner_agreements, landowner_unit_allocations
- **Document:** documents, document_versions, document_permissions
- **Workflow:** approvals, approval_steps, approval_rules
- **Notification:** notification_templates, notification_logs
- **Platform infrastructure:** audit_logs, outbox_events, idempotency_keys, document_sequences
- **Migration:** migration_batches, migration_issues

The **ledger is a query over `journal_lines`**, never a separate mutable table.

---

## 15. Scope by Part — What "Done" Means

### Part A — Backend (per release: v1.0 = P0+P1, then P2)

Every in-scope module in §8 exists as a NestJS module (`architecture.md` §7 module list); every rule in §16 is enforced and covered by tests; every acceptance test in §19 tagged for that release passes; every endpoint is documented in Swagger; the **Golden Flow** (§1.4) runs end-to-end through Bruno with no frontend.

### Part B — Desktop App

Every backend module has a fully functional, permission-aware screen/flow following `design.md` exactly, using only `packages/ui` components; Cloud mode and (P1) Standalone mode work; the app is packaged and installable on Windows, macOS and Linux; Standalone passes the same acceptance tests plus AT-34.

### Part C — Web App

The Vite + React web app reproduces every Desktop screen/flow with visual and functional parity, reusing `packages/ui`, `packages/features` and `packages/api-client` unchanged where possible, with added responsive behaviour for tablet/mobile browsers (`design.md`, _Responsive_).

---

## 16. Key Business Rules the Agent Must Never Violate

| ID        | Rule                                                                                                                                                                                                                                                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BR-01** | **One property, one active booking** — DB-level partial unique index + row lock, not just application checks.                                                                                                                                                                                                                     |
| **BR-02** | **Debit must equal credit** on every posted journal — unbalanced postings are rejected outright.                                                                                                                                                                                                                                  |
| **BR-03** | **No hard delete of financial records** (journals, payments, receipts, refunds, approvals, audit entries). Cancellations, refunds and corrections are new records/reversals.                                                                                                                                                      |
| **BR-04** | **Posted/locked transactions are immutable** — corrections only via reversal + new correct entry.                                                                                                                                                                                                                                 |
| **BR-05** | **Discounts, price exceptions, refunds, cancellations, waivers, reschedules, payment reversals and large expenses require approval** via MOD-APPROVAL before taking effect. Approvals are never skipped: they are granted, or auto-granted **with a full record** (§5.6). **Self-approval is blocked** on sensitive transactions. |
| **BR-06** | **Every financial-impact event must produce its accounting entry.** If the mapping is missing, **block the transaction** rather than post it unrecorded.                                                                                                                                                                          |
| **BR-07** | **All sensitive/financial changes are audit-logged** (actor, old value, new value, timestamp) synchronously in the same transaction (MOD-AUDIT).                                                                                                                                                                                  |
| **BR-08** | **Closed fiscal periods block new postings** unless reopened by a user with the reopen permission, with a reason (audited).                                                                                                                                                                                                       |
| **BR-09** | **Nothing business-rule-related is hard-coded**: discount limits, approval thresholds, tax/VAT, numbering, fiscal year, deduction %, hold times, units — all admin-configurable (§17).                                                                                                                                            |
| **BR-10** | **Permission and data-scope checks are server-side/API-level**; frontend menu visibility is never the control.                                                                                                                                                                                                                    |
| **BR-11** | **Property status changes only from workflow events**, never by direct field edit — except the permissioned, reasoned, audited override endpoint.                                                                                                                                                                                 |
| **BR-12** | **Both frontends consume identical backend contracts**; business logic is never duplicated or reimplemented per client.                                                                                                                                                                                                           |
| **BR-13** | **Tenant isolation:** a user can never read or write another company's rows; Super Admin has no access to tenant business data.                                                                                                                                                                                                   |
| **BR-14** | **A sale is counted once.** Transfers do not create a second sale in any KPI or report; cancelled bookings are excluded from sales.                                                                                                                                                                                               |
| **BR-15** | **Customer statement = AR ledger = aging** for each customer, always (difference ৳0.00).                                                                                                                                                                                                                                          |
| **BR-16** | **Money is exact:** decimal arithmetic only; allocations always sum exactly to the whole.                                                                                                                                                                                                                                         |
| **BR-17** | **Reservations expire:** a `REQUESTED` booking without the minimum booking amount is auto-cancelled after `reservation_hold_hours`, freeing the property.                                                                                                                                                                         |
| **BR-18** | **Receipts and payments are issued only on posting** (for cheques: on clearing); a receipt for an unposted payment must not exist.                                                                                                                                                                                                |
| **BR-19** | **Idempotent writes:** booking creation and payment posting must be safe to retry (`Idempotency-Key`).                                                                                                                                                                                                                            |
| **BR-20** | **License status never deletes data**; expired licenses degrade to read-only after the grace period.                                                                                                                                                                                                                              |

---

## 17. Configuration Catalogue (all defaults live in company settings)

| Key                                          | Default                                                                             | Meaning                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------- |
| `currency` / `timezone`                      | `BDT` / `Asia/Dhaka`                                                                | Fixed for v1                                 |
| `fiscal_year_start_month`                    | `7` (July)                                                                          | Fiscal year start                            |
| `land_unit_factors`                          | Decimal 435.6; Acre 43,560; Katha 720; Bigha 14,400 (sq ft)                         | Editable per company                         |
| `revenue_recognition`                        | `ON_BOOKING`                                                                        | `ON_BOOKING / ON_AGREEMENT / ON_HANDOVER` ⚠ |
| `min_booking_pct`                            | `10`                                                                                | Minimum booking amount % of net price        |
| `reservation_hold_hours`                     | `72`                                                                                | Auto-cancel unfunded `REQUESTED` bookings    |
| `approval_sla_hours`                         | `24`                                                                                | Escalation reminder for pending approvals    |
| `free_discount_limit_pct`                    | `0`                                                                                 | Discount without approval                    |
| `discount_base`                              | `BASE_PLUS_PREMIUM`                                                                 | Base on which discount % is computed ⚠      |
| `approval_rules` (discount)                  | Tier 1 ≤ 2 %, Tier 2 ≤ 5 %, Tier 3 > 5 %                                            | See MOD-DISCOUNT                             |
| `expense_md_threshold`                       | ৳5,00,000                                                                           | Expense amount needing MD approval           |
| `manual_journal_approval_threshold`          | ৳10,00,000                                                                          | Manual journal approval above this           |
| `cancellation_deduction_pct`                 | `10` of paid amount                                                                 | Refund = paid − deduction                    |
| `cancellation_property_status`               | `Available`                                                                         | Or `Blocked`                                 |
| `completion_policy`                          | `FULLY_PAID`                                                                        | When a booking may be `COMPLETED`            |
| `installment_default_split`                  | `EQUAL` via `Money.allocate`                                                        | Default payment plan                         |
| `late_fee_rate` / `late_fee_grace_days`      | `0` / `0`                                                                           | Simple monthly % on overdue principal        |
| `allocation_order`                           | `BOOKING_AMOUNT, DOWNPAYMENT, LATE_FEE, INSTALLMENT_OLDEST_FIRST, CUSTOMER_ADVANCE` | Default payment allocation ⚠                |
| `auto_apply_advance`                         | `false`                                                                             | Auto-apply customer advance to next due      |
| `cheque_post_on`                             | `CLEARED`                                                                           | Cheques post and receipt on clearing         |
| `reminder_schedule`                          | `-7, -3, 0, +3, +7, +30` days                                                       | Installment reminders                        |
| `budget_alert_levels`                        | `70 / 85 / 100` %                                                                   | Info / warning / critical                    |
| `vat_rate_by_charge_type`                    | `0`                                                                                 | Until accountant supplies rates ⚠           |
| `vendor_withholding_enabled`                 | `false`                                                                             | TDS/VDS lines on vendor bills ⚠             |
| `commission_trigger` / `commission_clawback` | `ON_CONFIRMED` / `true`                                                             | See FLOW-14                                  |
| `single_user_auto_approve`                   | `true` for Standalone / one-active-user companies, else `false`                     | See §5.6                                     |
| `allow_md_self_approval`                     | `false`                                                                             | MD may approve own requests (audit-flagged)  |
| `numbering_patterns`                         | e.g. `RCPT-{BRANCH}-{YEAR}-{SEQ:6}`                                                 | Per document type; reset rule configurable   |
| `document_language`                          | `en`                                                                                | `en` or `bn` (P1) per document type          |
| `license_grace_days`                         | `15`                                                                                | Then read-only                               |
| `standalone_backup_warn_days`                | `7`                                                                                 | Backup warning banner                        |
| `nightly_job_time`                           | `00:30` Asia/Dhaka                                                                  | Installment states, reminders, expiry        |

---

## 18. KPI Definitions (dashboard = reports; same calculation)

| KPI                         | Definition                                                                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Total Sales**             | Sum of net price of bookings with status ∈ {`CONFIRMED`, `AGREEMENT_PENDING`, `AGREEMENT_COMPLETED`, `COMPLETED`}, by confirmation date, excluding bookings created by transfer (BR-14) |
| **Total Collection**        | Sum of posted payments (net of reversals) in the period, excluding refunds                                                                                                              |
| **Outstanding Receivable**  | AR control account balance (= Σ customer outstanding, BR-15)                                                                                                                            |
| **Overdue Amount**          | Σ unpaid amount of installments with timing state `Overdue`                                                                                                                             |
| **Total Expense**           | Posted expense-account debits for the period (net of reversals)                                                                                                                         |
| **Accounts Payable**        | AP control account balance                                                                                                                                                              |
| **Net Profit**              | Income − Expense per the Profit & Loss report for the same period and recognition mode                                                                                                  |
| **Cash/Bank Balance**       | Σ cash and bank account balances from the ledger                                                                                                                                        |
| **Inventory Status**        | Count and value of properties by status (`Available/Hold/Reserved/Booked/Sold/Blocked`)                                                                                                 |
| **Project Profitability**   | `Revenue − Total Project Cost` per MOD-PROFIT                                                                                                                                           |
| **Lead Conversion Rate**    | Leads reaching `Customer` ÷ leads created in the period                                                                                                                                 |
| **Salesperson Performance** | Per executive: confirmed bookings (count, value), collection, lead conversion                                                                                                           |
| **Budget Utilization**      | Actual spend ÷ budget, per category/project                                                                                                                                             |
| **Collection Efficiency**   | Collected ÷ (due in period + overdue brought forward)                                                                                                                                   |

---

## 19. Acceptance Tests (baseline for automated tests)

All tests are automated. Priority = release in which the test must be green.

| ID         | Pri | Scenario                                                                                                                       | Expected result                                                                                                                                                       |
| ---------- | --- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AT-01**  | P0  | **Duplicate booking.** Book P-001 for Customer A, then for Customer B                                                          | A succeeds, P-001 `Booked`/`Reserved` per state; B rejected; exactly one active booking exists                                                                        |
| **AT-02**  | P0  | **Race.** Two simultaneous booking requests for P-001                                                                          | Exactly one succeeds; the other fails with a clear error; DB index would reject even if app logic were bypassed                                                       |
| **AT-03**  | P0  | **Idempotency.** Same booking request retried with the same `Idempotency-Key`                                                  | One booking, same response returned                                                                                                                                   |
| **AT-04**  | P0  | **Payment → accounting (default mode).** Receive and post ৳5,00,000                                                            | Journal: Debit Cash/Bank ৳5,00,000, Credit Customer Receivable ৳5,00,000; ledger updated; receipt issued                                                              |
| **AT-04b** | P0  | **Alternative recognition.** `revenue_recognition = ON_HANDOVER`; post ৳5,00,000                                               | Credit goes to Customer Advances (liability), not Receivable; revenue recognized only at `COMPLETED`                                                                  |
| **AT-05**  | P0  | **Partial payment.** Installment ৳3,00,000, pay ৳1,00,000 before due                                                           | Remaining ৳2,00,000; state `Partially Paid · Upcoming`                                                                                                                |
| **AT-06**  | P0  | **Discount tiers.** Executive requests 6 %                                                                                     | Blocked without approval; GM can approve 1 % and 4 % but **not** 6 %; MD approves 6 %; booking allowed; discount, approver, time logged; Executive cannot approve own |
| **AT-07**  | P0  | **Expense approval.** ৳6,00,000 expense                                                                                        | Needs MD approval (above ৳5,00,000); after approval and payment: Expense debit / Bank credit; project cost updated; (P1) budget actual updates                        |
| **AT-08**  | P0  | **Refund.** ৳10,00,000 paid, 10 % deduction                                                                                    | Refund ৳9,00,000; deduction ৳1,00,000 recognized; booking `CANCELLED`; property per policy; all steps audit-logged; approval required                                 |
| **AT-09**  | P0  | **Permission control.**                                                                                                        | Executive cannot view the full GL or process refunds; Accountant can post payments; only MD can change permissions                                                    |
| **AT-10**  | P0  | **Period lock.** Close January, post a January-dated entry                                                                     | Blocked; allowed only after MD reopens with a reason; reopen audited                                                                                                  |
| **AT-11**  | P0  | **Reservation expiry.** `REQUESTED` booking, no payment for `reservation_hold_hours`                                           | Auto-`CANCELLED` (reason `EXPIRED`), property `Available`, notification sent, audit written                                                                           |
| **AT-12**  | P0  | **Confirmation rule.** Net price ৳50,00,000, min 10 % (৳5,00,000). Post ৳4,99,999, then ৳1 more                                | Stays `REQUESTED` after the first; `CONFIRMED` after the second, with schedule, receivable, journal and receipt created in one transaction                            |
| **AT-13**  | P0  | **Cheque lifecycle.** Receive a cheque for the booking amount                                                                  | Stays `Received/Pending`, no journal, no receipt; on `Cleared` → posts, allocates, issues receipt, confirms booking; on `Bounced` → `Cancelled`, nothing posted       |
| **AT-14**  | P0  | **Statement match.** After bookings and partial payments                                                                       | Customer statement balance = AR ledger balance = AR aging total, exactly                                                                                              |
| **AT-15**  | P0  | **Dashboard = report.**                                                                                                        | Every dashboard KPI equals its report for the same filters                                                                                                            |
| **AT-16**  | P0  | **Data scope.** Executive A vs B leads under `OWN`; GM sees both                                                               | A cannot list/open B's records (including via search/export); GM can                                                                                                  |
| **AT-17**  | P0  | **Booking states.** `REQUESTED` booking blocks a second booking; cancel it                                                     | Second rejected; after cancel the property is free                                                                                                                    |
| **AT-18**  | P0  | **Login under RLS/tenancy.**                                                                                                   | User logs in (email lookup before tenant known) but can never read another company's rows                                                                             |
| **AT-19**  | P0  | **Number format.** ৳500000                                                                                                     | Renders `৳5,00,000`, English digits                                                                                                                                   |
| **AT-20**  | P0  | **Cross-client parity.** Booking created on Desktop, viewed on Web                                                             | Identical data, status, totals                                                                                                                                        |
| **AT-21**  | P0  | **Payment reversal.** Reverse a posted payment                                                                                 | Reversal journal posted; receipt marked void; installment returns to prior state; nothing deleted; approval and audit present                                         |
| **AT-22**  | P0  | **Overpayment.** Pay more than all dues                                                                                        | Excess recorded as customer advance; statement shows credit; never lost                                                                                               |
| **AT-23**  | P0  | **Rounding.** ৳1,00,000 split in 3 installments                                                                                | 33,333.34 + 33,333.33 + 33,333.33 = 1,00,000.00 exactly                                                                                                               |
| **AT-24**  | P0  | **Self-approval and auto-approve.** (a) multi-user company, requester tries to approve own refund; (b) one-active-user company | (a) blocked; (b) approval record created with `AUTO_APPROVED`, `auto=true`, audited — never skipped                                                                   |
| **AT-25**  | P0  | **Missing mapping.** Remove a required accounting mapping, then post                                                           | Transaction blocked with explicit reason; nothing partially saved                                                                                                     |
| **AT-26**  | P0  | **Unbalanced journal.** Submit debit ≠ credit                                                                                  | Rejected; nothing persisted                                                                                                                                           |
| **AT-27**  | P0  | **Land units.** Enter 5 Katha and 3 Decimal                                                                                    | Stored as sq ft using company factors (3,600 + 1,306.8); display converts back correctly                                                                              |
| **AT-28**  | P0  | **Installment timing.** Partially paid installment passes its due date                                                         | State `Partially Paid · Overdue N days`; aging bucket correct; reminders sent                                                                                         |
| **AT-29**  | P0  | **Migration gate.** Opening AR ≠ Σ legacy outstanding                                                                          | Wizard cannot finalize; differences listed per customer; passes at ৳0.00 or with approved adjustment                                                                  |
| **AT-30**  | P0  | **Tenant isolation / Super Admin.**                                                                                            | Super Admin can create tenants and licenses but cannot read any tenant's business records                                                                             |
| **AT-31**  | P0  | **License expiry.** Expire a license                                                                                           | Grace period banner → then read-only; data intact; export still possible                                                                                              |
| **AT-32**  | P0  | **Audit atomicity.** Force the audit write to fail                                                                             | The business change rolls back too                                                                                                                                    |
| **AT-33**  | P0  | **Waiver.** Waive an installment                                                                                               | Requires approval; adjustment posted; statement and aging updated                                                                                                     |
| **AT-34**  | P1  | **Local → Cloud migration.**                                                                                                   | Trial balance, per-customer AR, inventory status and document counts identical after import                                                                           |
| **AT-35**  | P1  | **Transfer.** Name transfer of a confirmed booking                                                                             | Old booking `TRANSFERRED`, new booking carries paid amounts and schedule; sale counted once in KPIs; AR moves between customers; transfer fee posted                  |
| **AT-36**  | P1  | **Commission.** Booking confirmed with broker; later cancelled                                                                 | Commission `Earned` at confirmation; reversed (unpaid) or broker receivable created (paid) on cancellation                                                            |
| **AT-37**  | P1  | **Budget alerts.** Spend reaches 70 %, 85 %, 100 %                                                                             | Info, warning, critical notifications respectively                                                                                                                    |
| **AT-38**  | P1  | **CSV migration.** Import malformed CSV                                                                                        | Validation report lists row-level errors; no partial import                                                                                                           |
| **AT-39**  | P1  | **Bangla template.** Receipt in `bn`                                                                                           | Bangla text and amount-in-words render correctly in PDF                                                                                                               |

---

## 20. Decisions, Defaults and Items for the Owner to Confirm

Every item has a **default the agent implements now** as configuration. ⚠ = the owner / chartered accountant must confirm before the first production go-live.

| Topic                                     | Default used until confirmed                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| ⚠ Chart of Accounts                      | Seeded default real-estate COA (`accounting-rules.md`); editable per company                                                          |
| ⚠ Revenue recognition                    | `ON_BOOKING`; alternatives `ON_AGREEMENT`, `ON_HANDOVER` (BFRS 15 treatment to be confirmed by the chartered accountant)              |
| ⚠ VAT / tax / TDS / VDS                  | 0 % everywhere until supplied; applicability per charge type; vendor withholding off                                                  |
| ⚠ Discount base                          | `base price + premium`                                                                                                                |
| ⚠ Payment allocation order               | `BOOKING_AMOUNT → DOWNPAYMENT → LATE_FEE → INSTALLMENT_OLDEST_FIRST → CUSTOMER_ADVANCE`                                               |
| ⚠ Land unit factors                      | MOD-PROPERTY table; company confirms Bigha standard                                                                                   |
| ⚠ License plans and limits               | To be defined by ExzaZone (plan names, user/branch/project limits, price)                                                             |
| Minimum booking amount                    | 10 % of net price                                                                                                                     |
| Reservation hold                          | 72 hours                                                                                                                              |
| Cancellation deduction                    | 10 % of paid amount; approval required                                                                                                |
| Installments                              | Equal split of (net price − booking amount) via `Money.allocate`; templates allow other shapes                                        |
| Late fee                                  | Disabled                                                                                                                              |
| Commission                                | Earned at `CONFIRMED`; clawback on cancellation                                                                                       |
| Completion policy                         | Fully paid                                                                                                                            |
| Receipt / agreement / quotation templates | Simple branded template with all required fields; replace when final design is supplied; agreement legal text supplied by the company |
| Project cost allocation                   | Direct cost by cost center; shared admin cost allocation off                                                                          |
| Data migration                            | Manual opening-balance and legacy-booking entry (P0); CSV templates (P1); no third-party importers                                    |
| Document language                         | English; Bangla templates P1                                                                                                          |
| Multi-currency                            | Not supported; NRB remittance details informational                                                                                   |
| Payment gateways                          | Method label only; no API integration                                                                                                 |
| Support access to tenant data             | Not provided in v1; any future access requires tenant-MD consent, time-boxed and audited                                              |

---

## 21. Glossary

| Term                                    | Meaning                                                              |
| --------------------------------------- | -------------------------------------------------------------------- |
| **BDT / ৳**                             | Bangladeshi Taka                                                     |
| **Lakh / Crore**                        | 1,00,000 / 1,00,00,000                                               |
| **Decimal, Katha, Bigha, Acre**         | Land area units (conversion factors in §17)                          |
| **Mouza, Dag, Khatian, Deed, Mutation** | Bangladeshi land-record terms                                        |
| **NRB**                                 | Non-Resident Bangladeshi                                             |
| **TIN / BIN**                           | Taxpayer / Business Identification Number                            |
| **TDS / VDS**                           | Tax / VAT deducted at source                                         |
| **Booking amount**                      | Initial payment that confirms a booking                              |
| **Net price**                           | `base + premium − discount + included charges`                       |
| **Receivable (AR)**                     | Money customers owe the company                                      |
| **Customer advance**                    | Money received but not yet applied to a due amount                   |
| **Suspense account**                    | Controlled holding account for unallocated money                     |
| **Reversal**                            | A new opposite entry that cancels a posted record without editing it |
| **Tenant**                              | One company's isolated data space                                    |
| **Cost center**                         | Accounting dimension tracking income/cost per project                |
| **Idempotency**                         | Safe retries: the same request does not create duplicates            |
| **Golden Flow**                         | The end-to-end acceptance journey in §1.4                            |

---

## 22. Hand-off to Companion Files and Change Log

### 22.1 What the other files must reflect (agents: flag conflicts; do not guess)

| File                    | Required alignment with this PRD v2.0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `architecture.md`       | (1) Property status enum is now `Available, Hold, Reserved, Booked, Sold, Blocked` (no `Cancelled`/`Transferred`). (2) New booking transition `PENDING_APPROVAL → REQUESTED`. (3) New entities in §14 (platform/license, co-buyers, nominees, payment-plan templates, charge types, opening-balance batches, migration batches, customer advances, `bookings.expires_at/legacy/is_transfer`). (4) Scheduled jobs: nightly installment state + reminders, reservation expiry, document expiry, license check. (5) **Dual Mode vs locked PostgreSQL 18 + Redis + BullMQ + S3 stack:** ARCH-DESKTOP-MODE must state how Standalone runs offline (embedded database and in-process queue) while keeping identical business logic — this is the largest open technical conflict. (6) Offline license verification. (7) Bangla-capable PDF fonts. (8) Rule that audit write failure rolls back the business change. |
| `accounting-rules.md`   | Posting templates for all three `revenue_recognition` modes; customer advances; cheque clearing; cancellation deduction and refund payable; installment waiver; late fee; transfer; commission earned/paid/clawback; opening balance journal; suspense; vendor withholding lines (disabled by default).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `permissions-matrix.md` | Rows from §5.4; discount tier permissions; `payment:create-draft`; approval permissions per action in MOD-APPROVAL; period reopen = MD only; license/tenant permissions for Super Admin only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `security.md`           | Super Admin cannot read tenant business data; 2FA for MD and privileged permissions; presigned file access; auto-approval and override audit flags; support-access policy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `design.md`             | Screens for setup checklist, migration wizard, payment plan builder, approval inbox, combined installment status chips, reservation countdown, Standalone backup banner, license banner.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `task.md`               | Reorder tasks to follow release scope §1.2–1.3 and milestones A-M1 / A-M2; add Golden Flow gate; add the acceptance tests of §19 as test tasks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `rules.md`              | Money/Decimal rules (§10), "block, never skip" rule, ID-based cross-references.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

### 22.2 Change log: v1.0 → v2.0

- Added document control, precedence rules, priority tags (P0/P1/P2), release milestones and the Golden Flow.
- Converted section-number references to stable `MOD-*`, `FLOW-*`, `BR-*`, `AT-*` IDs.
- Added measurable success metrics and an explicit non-goals list.
- Added missing modules/behaviour: **Platform & licensing**, **go-live migration (opening balances + legacy bookings)**, **payment plan templates**, **charge types**, **co-buyers/nominees/NRB notes**, **booking transfer**, **landowner JV (P2)**, **reservation expiry**, **cheque lifecycle**, **KPI definitions**, **configuration catalogue**.
- Resolved contradictions: MD "bypass" → auto-approve with record (§5.6); property status enum cleaned; installment status split into payment + timing parts; discount base and free allowance defined; booking confirmation rule defined; `PENDING_APPROVAL → REQUESTED` added.
- Defined Dual Mode capability matrix, backup policy and one-way Local → Cloud migration; flagged it as the highest-risk requirement.
- Expanded acceptance tests from 14 to 39 (including race, idempotency, reversal, rounding, tenancy, license, audit atomicity).
- Moved technology-heavy detail (library choices, schema, queue names) out of the product narrative; it remains referenced, not duplicated.

---

_End of PRD. Section 16 (Business Rules) is a hard constraint list for every part (A, B, C) — if a requested change would violate one, flag it before proceeding. See `task.md` for the ordered task list that implements this PRD._
