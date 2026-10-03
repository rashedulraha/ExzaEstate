# PROGRESS.md — ExzaEstate AI Execution Progress Tracker

**What this file is:** the project's single "memory" between AI sessions. An AI agent starts every session with no memory of earlier work, so it reads this file to learn what is done, what is next and what is blocked. It is also the **only place** where a task counts as complete: `agent/task.md` rule 3 says an agent may start a task only if every task listed in its `Depends:` is marked `[x]` **here**.

**Rules for AI agents (from `agent/task.md` §1):**

1. At the end of every task, tick its box in the ledger below **and** append a 5-line log entry to the history (task ID & status · files created/modified · verification command & result · open questions · next task ID).
2. Tick `[x]` only after every `Verify:` command and the task's DoD checks pass with zero errors. A task split over sessions is logged as `S<n> done` until its last step passes.
3. Never edit or delete older log entries. Never start the next task without the owner's approval (stop-and-halt).
4. When the owner answers a 🔒 sign-off or an open question, record the answer in §Sign-off Register.

---

## Current Status

- **Active Phase:** Phase A0 — Platform Foundations
- **Next Task to Execute:** `A0.8 Authentication, Sessions, Invitations`
- **Tasks complete:** 7 / 88 (P2 cards excluded)
- **Blockers:** None
- **Owner action items before/while coding:**
  - Copy the new `task.md` (v6) into `agent/task.md`.
  - Correct the source files for conflicts OQ-01…OQ-08 (see `task.md` §4.2): `rules.md` Prisma import, lockout-key wording, licence grace days, stale PRD section numbers, AT-04b wording, Super Admin role count.
  - Confirm OQ-04 (in-transaction booking-confirmation hook), OQ-06 (accountant sign-off on `ON_HANDOVER` posting), OQ-07 (CAPTCHA provider), OQ-09 (no Super Admin UI in v1).

---

## Sign-off Register (owner answers are recorded here)

| ID         | Question                                              | Gates       | Answer                                 | Date       |
| ---------- | ----------------------------------------------------- | ----------- | -------------------------------------- | ---------- |
| D-06       | `packages/app-core` separate from `ui`                | A0.1        | Confirmed (default: separate package)  | 2026-10-03 |
| D-05       | NestJS Express adapter                                | A0.3        | Confirmed (default: Express adapter)   | 2026-10-03 |
| D-09       | Separate system realm for Super Admin                 | A0.5, A1.5  | Confirmed (default: system realm)      | 2026-10-03 |
| D-07       | Idempotency row inside the business transaction       | A0.6        | Confirmed (default: inside tx)         | 2026-10-03 |
| D-11       | Monthly partitions for audit/outbox/notification logs | A0.6        | Confirmed (default: monthly partition) | 2026-10-03 |
| D-10       | App-level encryption + blind index (NID, bank no.)    | A0.12, A3.3 | _pending_                              |            |
| D-04       | Vertical slices (golden module first)                 | A2.1        | _pending_                              |            |
| D-13       | Additive-only `/v1`, `X-Client-Version`, 426          | A2.3, A9.7  | _pending_                              |            |
| D-08       | `APPROVAL_REQUIRED` = HTTP 409                        | A4.4        | _pending_                              |            |
| D-14       | `events/` renamed `realtime/`                         | A9.1        | _pending_                              |            |
| D-01/02/03 | Bundled PostgreSQL / bundled Chromium / Node sidecar  | A10.1, B9   | _pending_                              |            |
| D-12       | Local→Cloud import design                             | A10.4       | _pending_                              |            |
| D-15       | Licence transfer limit, fingerprint tolerance         | A1.5, B10   | _pending_                              |            |
| OQ-04      | In-transaction `PaymentPostedHook`                    | A7.2        | _pending_                              |            |
| OQ-06      | `ON_HANDOVER` posting treatment                       | A6.4        | _pending (accountant)_                 |            |
| OQ-07      | CAPTCHA provider (default Turnstile)                  | A0.12       | _pending_                              |            |
| OQ-09      | No Super Admin UI in v1                               | B8          | _pending_                              |            |

---

## Task Completion Ledger

Tick a box only after the verification rules above are met. Dependencies are defined in `agent/task.md`.

### Phase A0 — Platform Foundations

- [x] `A0.1` Monorepo & Tooling Foundation
- [x] `A0.2` Shared Package: Constants, Types, Money, Localisation
- [x] `A0.3` Backend Foundations: NestJS 12 ESM, Config, Envelope
- [x] `A0.4` Database: Docker Compose & Prisma 7 Multi-File Schema
- [x] `A0.5` Multi-Tenancy: RLS, DB Roles, TenantPrisma, SystemPrisma
- [x] `A0.6` Platform Services: Audit, Sequence, Outbox, Idempotency, Storage
- [x] `A0.7` Ports & Adapters Skeleton, Outbox Dispatcher, Worker Entrypoint
- [ ] `A0.8` Authentication, Sessions, Invitations
- [ ] `A0.9` Permissions, RBAC, Data Scopes, Mandatory 2FA
- [ ] `A0.10` Tenant Provisioning Registry & Baseline Seed
- [ ] `A0.11` CI/CD, Docker Images & Quality Gates
- [ ] `A0.12` Security Hardening & Observability

### Phase A1 — Master Data, Platform Admin & Foundation Modules

- [ ] `A1.1` Company, Branch, Department, Settings & Numbering
- [ ] `A1.2` Roles, Users, Invitations, Employees & Hierarchy
- [ ] `A1.3` Land Master & Bangladeshi Area Conversion
- [ ] `A1.4` Project & Cost Center Management
- [ ] `A1.5` Platform Admin: System Realm, Tenant Onboarding & Licensing (backend)
- [ ] `A1.6` Documents Module (Presigned Upload & Versioning)
- [ ] `A1.7` Audit Query API & Security-Event Viewer
- [ ] `A1.8` Notification Engine Core (in-app)

### Phase A2 + B1 — Golden Vertical Slice (Property)

- [ ] `A2.1` Property Data Model, Hierarchy & RLS
- [ ] `A2.2` Property CRUD, Pricing Breakdown & Status API
- [ ] `A2.3` OpenAPI Export, Generated Client & HTTP Layer
- [ ] `A2.4` Conformance Sweep: Backend Golden Module
- [ ] `B1.1` Desktop Shell (Cloud mode), `app-core` & Auth Screens
- [ ] `B1.2` Design System Tokens & Signature Components
- [ ] `B1.3` Property Feature Pages
- [ ] `B1.4` Golden Slice Review Gate & Playwright E2E

### Phase A3 — CRM & Customers

- [ ] `A3.1` Lead Capture, Sources & Pipeline
- [ ] `A3.2` Follow-Ups & Overdue Alerts
- [ ] `A3.3` Customer 360 & KYC
- [ ] `A3.4` Lead→Customer Conversion & Activity Timeline

### Phase A4 — Plans, Quotations & Approvals

- [ ] `A4.1` Payment Plan Templates & Installment Calculation Engine
- [ ] `A4.2` Charge Types & Fees Catalogue
- [ ] `A4.3` Quotation Generation & Branded PDF
- [ ] `A4.4` Generic Approval Engine & Discount Matrix

### Phase A5 — Bookings & Concurrency

- [ ] `A5.1` Booking State Machine & Validation Pipeline
- [ ] `A5.2` Payment Entity & Draft Booking Payments
- [ ] `A5.3` Concurrency Guard: Row Lock & Partial Unique Index
- [ ] `A5.4` Agreement Generation, Locking & Versioning
- [ ] `A5.5` Reservation Expiry Job

### Phase A6 — Accounting Core

- [ ] `A6.1` Chart of Accounts & Account Balances
- [ ] `A6.2` Fiscal Years & Periods (Period Close/Reopen)
- [ ] `A6.3` Journal Engine, Immutability & Reversals
- [ ] `A6.4` Posting Rules Registry & `PostingService`
- [ ] `A6.5` Cash & Bank Accounts, Transfers & Reconciliation
- [ ] `A6.6` Financial Reports: Ledger, Trial Balance, Balance Sheet, Income Statement

### Phase A7 — Payments & Collection

- [ ] `A7.1` Installment Schedule Persistence & Timing State
- [ ] `A7.2` Payment Posting, Allocation & Booking Confirmation
- [ ] `A7.3` Cheque Lifecycle (`cheque_events`)
- [ ] `A7.4` Immutable Receipts, Voids & Payment Reversals
- [ ] `A7.5` Customer Statement & AR Reconciliation
- [ ] `A7.6` Booking Cancellation & Refund
- [ ] `A7.7` Installment Waiver & Late Fee
- [ ] `A7.8` Overdue Calculation Job, Aging & Reminders
- [ ] `A7.9` Go-Live Migration (Opening Balances & Legacy Bookings)

### Phase A8 — Expenses, Vendors, Commission, P1 Ops

- [ ] `A8.1` Expense Vouchers, Categories & Approval Thresholds
- [ ] `A8.2` Vendor Master, Bills & AP Payments
- [ ] `A8.3` Commission Rules, Broker Accruals & Payouts
- [ ] `A8.4` Budgets & Spend Alerts
- [ ] `A8.5` Booking Transfer (Name Transfer)
- [ ] `A8.6` Project Profitability Report

### Phase A9 — Realtime, Dashboards, Search & Gates

- [ ] `A9.1` Realtime SSE Stream
- [ ] `A9.2` SMS/Email Channels, Delivery Worker & Bangla Templates
- [ ] `A9.3` Management Dashboard KPIs & Collection Reports
- [ ] `A9.4` Global Search
- [ ] `A9.5` CSV Migration Import
- [ ] `A9.6` Golden Flow Gate & Acceptance-Test Matrix (A-M1 / A-M2)
- [ ] `A9.7` API Freeze & Breaking-Change Check

### Phase A10 — Local Standalone & Migration

- [ ] `A10.1` Local Mode Adapters, In-Process Worker & `main.local.ts`
- [ ] `A10.2` Local Security: Loopback Binding & Per-Launch Secret
- [ ] `A10.3` Local Data Lifecycle: Migrations, Backups, Restore, Export
- [ ] `A10.4` Local→Cloud Export/Import Pipeline

### Part B — Desktop Client (B2–B11)

- [ ] `B2` CRM, Leads & Customer 360 Screens
- [ ] `B3` Sales, Quotations, Approvals & Booking Wizard
- [ ] `B4` Collection, Receipts & Payment Terrace
- [ ] `B5` Accounting: COA, Journals, Ledgers, Trial Balance, Periods
- [ ] `B6` P1 Operations: Expenses, Vendors/AP, Commission, Budgets, Transfers, Profitability
- [ ] `B7` Dashboard, Reports, Global Search, Notifications & Audit Viewer
- [ ] `B8` Settings, Users & Roles, Setup Checklist, Go-Live Migration Wizard
- [ ] `B9` Desktop Local Standalone: Sidecar, Embedded PostgreSQL, First-Launch Wizard
- [ ] `B10` Desktop Licensing & Hardware Binding (Rust)
- [ ] `B11` Desktop Packaging, Auto-Updater & Tauri Hardening

### Part C — Web Client

- [ ] `C1` Web SPA Shell, Platform Adapters & Cookie-Refresh Auth
- [ ] `C2` Responsive Layouts & Mobile Card Views
- [ ] `C3` Web Deployment, CDN & Security Headers
- [ ] `C4` Playwright Critical Flows: Web ⇄ Desktop Parity
- [ ] `C5` Pre-Launch Security & Release Gate

### Release v1.x — P2 (compact, expand at release planning)

- [ ] `P2.1` Assets & Maintenance
- [ ] `P2.2` Procurement (PR → PO → GRN)
- [ ] `P2.3` Development Management
- [ ] `P2.4` Landowner Joint Venture
- [ ] `P2.5` WhatsApp, marketing-ROI report, support access

---

## Task Execution History

### [2026-10-01] Specification Alignment & Task Decomposition

- **Task:** Spec Audit & Conflict Resolution
- **Files Modified:** `agent/accounting-rules.md`, `agent/permissions-matrix.md`, `agent/golden-module-frontend.md`, `agent/design.md`, `agent/prd.md`, `agent/architecture.md`, `agent/rules.md`, `AGENTS.md`, `agent/task.md`
- **Changes:** Eliminated version drift; fixed desktop dual-mode sidecar architecture; resolved COA missing account 2600 and enum types; harmonized GM 2FA and approval overrides; split oversized tasks in `task.md`.
- **Status:** Complete. Ready for Part A execution starting with `A0.1`.

### [2026-10-03] task.md v5 → v6 Rewrite (second audit)

- **Task:** Task-plan audit (not an implementation task)
- **Files Modified:** `agent/task.md`, `agent/PROGRESS.md`
- **Verification:** script check — 88 task cards, 0 dangling `Depends:`, 0 forward dependencies; Golden Flow/acceptance-test/module coverage appendices added.
- **Open questions:** OQ-01…OQ-09 and 🔒 gates D-01…D-15 (see Sign-off Register and `task.md` §4).
- **Next task:** `A0.1`. (Status: complete; the earlier entry above stays valid.)

### [2026-10-03] A0.1 Monorepo & Tooling Foundation

1. Task ID & status: A0.1 [x]
2. Files created / modified: package.json, pnpm-workspace.yaml, turbo.json, .prettierrc, .editorconfig, .nvmrc, .gitignore, .husky/pre-commit, packages/config/**, apps/backend/**, apps/desktop/**, apps/web/**, packages/shared/**, packages/api-client/**, packages/ui/**, packages/app-core/**, packages/features/\*\*, agent/PROGRESS.md
3. Verification command & result: pnpm install, pnpm lint, pnpm typecheck, pnpm build (all clean with 0 errors; deliberate circular import and modules/_ -> adapters/_ imports verified failing)
4. Open questions: None
5. Next task ID: A0.2

### [2026-10-03] A0.2 Shared Package: Constants, Types, Money, Localisation

1. Task ID & status: A0.2 [x]
2. Files created / modified: packages/config/tsconfig.base.json, packages/shared/package.json, packages/shared/src/index.ts, packages/shared/src/permissions.ts, packages/shared/src/error-codes.ts, packages/shared/src/events.ts, packages/shared/src/statuses.ts, packages/shared/src/money.ts, packages/shared/src/money.spec.ts, packages/shared/src/format.ts, packages/shared/src/format.spec.ts, packages/shared/src/permissions.spec.ts, packages/shared/src/i18n/en.json, packages/shared/src/i18n/t.ts, agent/PROGRESS.md
3. Verification command & result: pnpm --filter @exzaestate/shared build && pnpm --filter @exzaestate/shared test (27/27 tests passed across 3 test suites, property-based tests verified with fast-check; monorepo lint, typecheck, and build clean with 0 errors)
4. Open questions: None
5. Next task ID: A0.3

### [2026-10-03] A0.3 Backend Foundations: NestJS 12 ESM, Config, Envelope

1. Task ID & status: A0.3 [x]
2. Files created / modified: .env.example, apps/backend/package.json, apps/backend/tsconfig.json, apps/backend/vitest.config.ts, apps/backend/src/main.ts, apps/backend/src/bootstrap.ts, apps/backend/src/app.module.ts, apps/backend/src/index.ts, apps/backend/src/config/**, apps/backend/src/common/**, apps/backend/src/modules/health/\*\*, apps/backend/test/envelope.spec.ts, pnpm-workspace.yaml, agent/PROGRESS.md
3. Verification command & result: pnpm --filter @exzaestate/backend build && pnpm --filter @exzaestate/backend test config && pnpm --filter @exzaestate/backend test envelope (all 13 tests passed in backend, 40/40 tests across monorepo passed; oxlint, depcruise, cycle-check, typecheck, build clean)
4. Open questions: None (Gate D-05 confirmed with default Express adapter)
5. Next task ID: A0.4

### [2026-10-03] A0.4 Database: Docker Compose & Prisma 7 Multi-File Schema

1. Task ID & status: A0.4 [x]
2. Files created / modified: docker-compose.yml, docker/postgres-init/01-init-roles.sql, .env.example, apps/backend/package.json, apps/backend/prisma.config.ts, apps/backend/prisma/schema/base.prisma, apps/backend/src/database/\*\*, apps/backend/src/index.ts, apps/backend/test/db-connection.spec.ts, pnpm-lock.yaml, pnpm-workspace.yaml, agent/PROGRESS.md
3. Verification command & result: docker compose up -d && docker compose ps (all 4 containers up and healthy); pnpm --filter @exzaestate/backend exec prisma validate (valid schema); pnpm --filter @exzaestate/backend test db-connection (2/2 tests passed: SELECT 1 and PostgreSQL 18.x version verified); curl check (MinIO console :9001 and Mailpit UI :8025 both HTTP 200 OK); 42/42 tests pass across monorepo, lint and typecheck clean with 0 errors
4. Open questions: None (Zero gated decisions for A0.4; D-09 pending for A0.5)
5. Next task ID: A0.5

### [2026-10-03] A0.5 Multi-Tenancy: RLS, DB Roles, TenantPrisma, SystemPrisma

1. Task ID & status: A0.5 [x]
2. Files created / modified: apps/backend/prisma/migrations/20261003000000_init_roles_and_rls/migration.sql, apps/backend/src/common/context/**, apps/backend/src/database/**, apps/backend/test/tenant-isolation/\*\*, agent/PROGRESS.md
3. Verification command & result: prisma migrate deploy (all migrations applied); vitest tenant-context (3/3 passed); vitest tenant-transaction (3/3 passed); vitest system-prisma (3/3 passed); vitest tenant-isolation (12/12 passed); monorepo lint, typecheck, and all 54 tests passed with 0 errors
4. Open questions: None (Gate D-09 confirmed: default system realm for platform operations)
5. Next task ID: A0.6

### [2026-10-03] A0.6 Platform Services: Audit, Sequence, Outbox, Idempotency, Storage

1. Task ID & status: A0.6 [x]
2. Files created / modified: apps/backend/prisma/schema/platform.prisma, apps/backend/prisma/migrations/20261003000001_platform_services/migration.sql, apps/backend/src/platform/**, apps/backend/test/platform/**, apps/backend/test/tenant-isolation/tenant-isolation.spec.ts, apps/backend/package.json, pnpm-lock.yaml, agent/PROGRESS.md
3. Verification command & result: prisma migrate deploy (applied); pnpm test audit-outbox (7/7 passed); pnpm test sequence (5/5 passed); pnpm test idempotency (5/5 passed); pnpm test storage (3/3 passed); monorepo lint, typecheck, and all 74 tests passed with 0 errors
4. Open questions: None (Gates D-07 [idempotency inside tx] and D-11 [monthly partitions] recorded in Sign-off Register)
5. Next task ID: A0.7

### [2026-10-03] A0.7 Ports & Adapters Skeleton, Outbox Dispatcher, Worker Entrypoint

1. Task ID & status: A0.7 [x]
2. Files created / modified: apps/backend/src/ports/**, apps/backend/src/adapters/**, apps/backend/src/platform/outbox/**, apps/backend/src/platform/platform.module.ts, apps/backend/src/jobs/**, apps/backend/src/main.worker.ts, apps/backend/test/adapters/\*\*, apps/backend/test/platform/outbox-dispatcher.spec.ts, apps/backend/package.json, package.json, pnpm-lock.yaml, pnpm-workspace.yaml, agent/PROGRESS.md
3. Verification command & result: pnpm --filter @exzaestate/backend build (0 errors); pnpm test adapters-cloud (7/7 passed); pnpm test adapters-contract (14/14 passed); pnpm test outbox-dispatcher (4/4 passed); full workspace tests (72/72 passed); oxlint, dependency-cruiser, and cycle checks clean with 0 errors
4. Open questions: None (Zero gated decisions for A0.7; D-10 pending for A0.12)
5. Next task ID: A0.8
