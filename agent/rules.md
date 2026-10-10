# rules.md — ExzaEstate Development Rules & Coding Standards

How code is written day to day: style, tooling, workflow, review. It does **not** restate architecture; it points to stable IDs in `architecture.md`. Precedence and reading order are in `AGENTS.md`.

## 0. Which Part am I in?

Confirm from `task.md` before writing code. **Part A** (backend) → §2–§3. **Part B** (desktop) → §4.1–4.2 (+ §2 if touching the API). **Part C** (web SPA) → §4.1, §4.3. Part A must be complete before B, and B before C. If a task tempts you to jump ahead, stop and flag it.

## 1. Core philosophy

- **Layering:** controllers handle HTTP only (DTO in → service call → data out). **Services own business logic and all database calls** (through `TenantPrisma`). There is **no repository layer** (`architecture.md` §7.1). No Prisma in controllers, no business logic in DTOs or React components.
- **Strict TypeScript:** no `any` (use `unknown` and narrow). Every DTO, model and prop is typed.
- **No hard-coding:** tax, thresholds, formats, rates, land factors live in settings / `approval_rules` / posting rules (`prd.md` §3 goal 9), or in typed env config.
- **DRY, not premature:** rule of three (`architecture.md` §13). In Part C the "reuse first" rule replaces it: if a component exists in `packages/ui`, use it.
- **Small units:** file ≤ 300 lines, function ≤ 50, complexity ≤ 10 (enforced by oxlint).

---

## 1.1 Strict Negative Invariants (NEVER vs ALWAYS — Anti-Pattern Matrix)

Every AI agent working on ExzaEstate must adhere to these non-negotiable rules. Violations will cause immediate build or runtime failures.

| Technology / Domain        | ❌ NEVER DO THIS (Outdated / Backdated Anti-Patterns)                                                                                                   | ✅ ALWAYS DO THIS (Mandatory ExzaEstate Standard)                                                                                                                                    |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prisma 7 Schemas**       | ❌ NEVER create a single monolithic `schema.prisma`.<br>❌ NEVER add `url = env("DATABASE_URL")` or connection strings directly inside `.prisma` files. | ✅ ALWAYS use multi-file schemas in `apps/backend/prisma/schema/*.prisma`.<br>✅ `base.prisma` defines generator and datasource provider only.                                       |
| **Prisma 7 Config**        | ❌ NEVER rely on legacy Prisma CLI datasource discovery without config.                                                                                 | ✅ ALWAYS configure datasources, adapter, and migrations in `apps/backend/prisma.config.ts` via `defineConfig` from `@prisma/config`.                                                |
| **Prisma Client & RLS**    | ❌ NEVER use raw `prisma.$transaction()` on tenant tables.<br>❌ NEVER query tenant tables without setting the tenant context.                          | ✅ ALWAYS use `@prisma/adapter-pg` driver adapter with `pg.Pool`.<br>✅ ALWAYS use `tenantDb.transaction(async (tx) => ...)` which sets `SET LOCAL app.current_company_id`.          |
| **NestJS 12 ESM**          | ❌ NEVER omit the `.js` extension on relative imports (e.g. `import { X } from './x'` will crash in Node ESM).<br>❌ NEVER use CommonJS `require()`.    | ✅ ALWAYS write `.js` extensions on all relative imports (e.g. `import { X } from './x.js'`).                                                                                        |
| **Tailwind CSS v4**        | ❌ NEVER create `tailwind.config.js` or `tailwind.config.ts` (Tailwind v3 legacy).<br>❌ NEVER use `@tailwind base;` syntax.                            | ✅ ALWAYS use CSS-first configuration: `@import "tailwindcss";` and `@theme { ... }` in CSS with Meridian tokens from `agent/design.md`.                                             |
| **React 19**               | ❌ NEVER use `forwardRef()` (deprecated in React 19).<br>❌ NEVER hardcode mock data arrays (`const mockData = [...]`).                                 | ✅ Pass `ref` directly as a regular prop.<br>✅ Consume generated TanStack Query hooks; test with real seed data (`pnpm db:seed:demo`).                                              |
| **Money Handling**         | ❌ NEVER use JS `Number` or floating-point arithmetic for currency.                                                                                     | ✅ ALWAYS store integer **paisa** as `BigInt` in PostgreSQL / Prisma; transport as `string` in DTOs; format with `formatMoney` (`BDT 5,00,000`).                                     |
| **Icons & Visual Clutter** | ❌ NEVER use unnecessary, decorative, or redundant icons (e.g. decorative icon badges on cards, filler icons in headers or feature lists).              | ✅ ONLY use icons where functionally indispensable (e.g. password visibility toggle, status indicator glyphs, table sorting). Let typography, structure, and spacing convey clarity. |

---

## 2. Backend conventions (NestJS 12, ESM) — Part A

| Item                  | Convention                                 | Example                                  |
| --------------------- | ------------------------------------------ | ---------------------------------------- |
| Files                 | `kebab-case`                               | `installment-schedule.service.ts`        |
| Classes               | `PascalCase`                               | `InstallmentService`, `CreateBookingDto` |
| Variables / functions | `camelCase`                                | `calculateInstallment`                   |
| Constants             | `SCREAMING_SNAKE_CASE`                     | `ACTIVE_BOOKING_STATUSES`                |
| DB                    | `snake_case`, mapped with `@map`           | `company_id` ↔ `companyId`              |
| Imports               | ESM with `.js` extension on relative paths | `import { X } from './x.js'`             |

### 2.1 Prisma 7 Multi-File Schema & Driver Adapter Architecture

ExzaEstate uses **Prisma 7** (`7.10.0`) with native driver adapters and multi-file schema support.

1. **File Hierarchy in `apps/backend/`:**

   ```
   apps/backend/
   ├── prisma.config.ts             # Prisma 7 root config (defineConfig)
   └── prisma/
       ├── schema/                  # Multi-file schema directory
       │   ├── base.prisma          # Generator & DB provider only (NO connection url)
       │   ├── auth.prisma          # Users, sessions, 2FA
       │   ├── company.prisma       # Companies, branches, configurations
       │   ├── property.prisma      # Lands, projects, units, blocks
       │   ├── booking.prisma       # Bookings, installments, payments
       │   ├── accounting.prisma    # COA, journals, ledger entries
       │   └── ...                  # One .prisma per domain module
       ├── migrations/              # SQL migrations (including RLS policies)
       ├── seed.ts                  # Baseline system seed (roles, COA)
       └── seed.demo.ts             # Development & demo seed data
   ```

2. **`base.prisma` Standard:**

   ```prisma
   // apps/backend/prisma/schema/base.prisma
   generator client {
     provider        = "prisma-client-js"
     previewFeatures = ["driverAdapters"]
   }

   datasource db {
     provider = "postgresql"
   }
   ```

3. **`prisma.config.ts` Standard:**

   ```typescript
   // apps/backend/prisma.config.ts
   import { defineConfig } from '@prisma/config';

   export default defineConfig({
     schema: 'prisma/schema',
     datasource: {
       url: process.env.DATABASE_URL,
     },
   });
   ```

4. **Runtime Driver Adapter:**
   Always instantiate Prisma with `@prisma/adapter-pg` and `pg.Pool` inside the database module to support high-performance connection pooling and session-level RLS variable injection (`SET LOCAL app.current_company_id = ...`).

**Layer rules**

- Module folder shape is exactly `architecture.md` §7.1: `dto/`, `<feature>.controller.ts`, `<feature>.service.ts`, `<feature>.module.ts`, `<feature>.events.ts` (if it emits events), `<feature>.service.spec.ts`. No `entities/` folder.
- Every body/query is a `class-validator` DTO; controllers never read `req.body`/`req.query`.
- Errors: throw typed exceptions mapped to the envelope and error codes in `packages/shared/src/error-codes.ts`; never a bare `throw new Error`.
- Multi-table work: `tenantDb.transaction(async (tx) => …)` (`RULE-ATOMIC`). **Never** a raw `prisma.$transaction` for tenant data — it would not set the RLS variable and queries would silently return nothing.
- Approvable actions call `approvalsService.request({...})` (`ARCH-APPROVALS`) — never an inline `if (discount > 5) throw`.
- Financial or sensitive writes call `AuditService.record(tx, …)` in the same transaction (`ARCH-AUDIT`); side effects use `OutboxService.emit(tx, …)`; document numbers use `SequenceService.next(tx, …)`; journal lines only via `PostingService.post(…)` (`RULE-POSTING`).
- Tests and new endpoints follow the golden module (`architecture.md` §18).

## 3. System rules every change must respect (IDs, not numbers)

| Rule                                                                               | ID                     |
| ---------------------------------------------------------------------------------- | ---------------------- |
| Every query scoped by `companyId` from verified context; RLS on every tenant table | `ARCH-RBAC`, §5        |
| Permission-based RBAC + data scope, checked server-side                            | `ARCH-RBAC`            |
| Journal `debit === credit` before persist                                          | `RULE-DOUBLE-ENTRY`    |
| Posted journals/payments/receipts: no update/delete, only reversal                 | `RULE-IMMUTABLE`       |
| One active booking per property (DB partial unique index + row lock)               | `RULE-BOOKING-RACE`    |
| Property status only from booking events or the audited override                   | `RULE-PROPERTY-STATUS` |
| Closed periods reject postings                                                     | `RULE-PERIOD`          |
| Every critical action writes `audit_logs` synchronously                            | `ARCH-AUDIT`           |
| Retry-safe endpoints take `Idempotency-Key`                                        | `ARCH-IDEMPOTENCY`     |
| Money as paisa `BigInt` / string, one `Money` helper                               | `ARCH-MONEY`           |

If a task seems to require breaking one of these, stop and flag it.

## 4. Frontend conventions — Parts B & C

### 4.1 Shared

- Components are small, functional, hook-based; split a component that fetches, lays out and holds business logic.
- **Where code lives:** platform-agnostic code goes in `packages/ui`, `packages/features`, `packages/api-client` or `packages/shared`. There is **no `packages/types`** — types come from the generated client and `shared`. Nothing platform-agnostic in `apps/*`.
- **State:** server data only via generated TanStack Query hooks; UI-only state in Zustand per app.
- **Tables:** shared `DataTable` (server pagination, sort, filter, virtualization > 100 rows).
- **Formatting:** `formatMoney`, `formatDate`, `formatNumber`, `formatArea` from **`packages/shared`** only — never inline, never `Number(amount)` arithmetic. Lakh/crore grouping (`BDT 5,00,000`). Never use the `৳` symbol.
- **Strings:** every user-facing string through `t('key')` or centralized constants; English only (maintain `en.json`).
- **No hardcoded mock data in UI:** Components and pages must never hardcode mock data arrays (`const mockData = [...]`). UI always consumes real API hooks. Development and visual verification use database seed data populated via `pnpm db:seed:demo` (`ARCH-SEED`).
- **No Unnecessary Icons Rule:** Never sprinkle decorative icons on cards, buttons, or headers where typography and layout suffice. Icons must only be used where functionally indispensable (e.g. eye toggle for secret fields, sorting arrows, status badge indicator glyphs).
- **Errors:** branch on `error.code`, never `error.message`.
- **Charts:** only `packages/ui/charts` (`design.md`).

#### 4.1.1 Tailwind CSS v4 (CSS-First, Zero JS Config)

- **Strict Ban:** `tailwind.config.js` or `tailwind.config.ts` must **NEVER** be created anywhere in the monorepo.
- **CSS-First Theme:** All styling uses Tailwind CSS 4 `@import "tailwindcss";` and `@theme` blocks defined in `packages/ui/src/styles/theme.css`.
- **Design Tokens:** Tokens must match the Meridian palette in `agent/design.md`. Never use arbitrary inline values like `text-[#1a2b3c]` or `p-[17px]`.

#### 4.1.2 React 19 Standards

- **No `forwardRef`:** React 19 passes `ref` directly as a standard component prop. Never wrap components with `React.forwardRef()`.
- **Hooks & Actions:** Use React 19 standard hooks (`useActionState`, `useOptimistic`) where appropriate; avoid deprecated React 18 patterns.

### 4.2 Desktop (Part B)

Tauri APIs are imported **only** under `apps/desktop/src/platform/`, behind small interfaces (`SecureStorage`, `FileDialog`, `Updater`, `Notifier`, `openExternal`). New shared components go straight into `packages/ui`; never leave them inline "to extract later". In Local Standalone Mode, Tauri manages the bundled NestJS backend as a local Sidecar, ensuring feature screens in `packages/features` operate identically via `@exzaestate/api-client` without awareness of whether the API is remote cloud or localhost (`ARCH-DESKTOP-MODE`).

### 4.3 Web (Part C — Vite SPA)

The web app is a thin shell: entry point, `platform/` implementations (httpOnly-cookie refresh, `<input type=file>`), deployment config. Default assumption: **reuse, don't rewrite.** Responsive behaviour is added _to_ shared components (e.g. `DataTable variant="cards"`), never as a fork. There are no server components and no Next.js.

## 5. Tooling

- **oxlint** (lint) + **Prettier** (format) + **dependency-cruiser** (boundaries) + **madge** (cycles), configs in `packages/config`. No `// oxlint-disable` without a one-line reason.
- Husky + lint-staged: lint, format, typecheck, `gitleaks` on staged files.
- Import order: external → workspace (`@exzaestate/*`) → relative, blank line between groups.
- No commented-out code in merged PRs.

## 6. Testing (the flow and its tests ship together)

- **Backend:** Vitest. A service method with a branch or validation rule ships with a unit test; a state-changing financial endpoint ships with an e2e test **and** a tenant-isolation test; a bug fix ships with a regression test.
- **Frontend:** Vitest + Testing Library for `packages/ui` and complex feature components.
- **Playwright:** each critical flow (login, booking, payment, journal posting) gets its spec **in the same task that builds the flow**, not at the end.
- Part C ports the Part B specs (selectors/routes only); a genuinely new spec signals divergence — flag it.

## 7. AI Agent Execution Discipline & PROGRESS.md

1. **One Task at a Time:** An agent executes strictly **one** numbered task per session. Never bundle multiple tasks or begin the next task before current tests pass and Definition of Done (DoD) is satisfied.
2. **Strict Reads Scope:** Load only the files listed under the task's `Reads:` section. Do not dump the entire 225 KB documentation into context.
3. **No Shortcut Policy:** Never delete, stub, or skip tests to rush a task. If a task requires 10 assertions and 1 isolation test, all must pass.
4. **Log in `agent/PROGRESS.md`:** At the completion of each task, append a concise 5-line status entry in `agent/PROGRESS.md` detailing: Task ID, files created/modified, tests executed, and readiness for the next task.
5. **Mandatory Pre-Completion Verification Pipeline:** Before concluding any turn or marking a task done, the agent MUST run the following terminal checks and verify zero errors:
   ```bash
   pnpm prisma validate      # If touching Prisma schemas
   pnpm oxlint               # Lint check across modified files
   pnpm typecheck            # Full TypeScript strict validation
   pnpm test                 # Relevant unit/integration tests
   ```
6. **Stop-and-Halt:** When a task is done and tests are green, stop execution, report the summary to the user, and wait for approval to begin the next task.

## 8. Documentation & comments

Comments explain _why_. Non-obvious business rules link to `prd.md` / `accounting-rules.md` by ID. DTOs and routes carry `@nestjs/swagger` decorators (the API contract). The Bruno collection in `apps/backend/bruno/` is updated whenever an endpoint changes.

## 9. Environment & secrets

`.env` never committed; `.env.example` per app. Read config only through the typed, zod-validated `ConfigService`; never `process.env` in business code. Different secrets per environment. **Zero Hardcoded Secrets & DB URLs:** Never hardcode database connection strings, credentials, or fallback database URLs (e.g., `postgresql://...`) in source code, configuration files, or scripts. Database URLs must strictly be loaded from environment variables (`DATABASE_URL`, `MIGRATOR_DATABASE_URL`, `SYSTEM_DATABASE_URL`). If missing, code must fail-fast and throw an explicit `Error` instructing the user to configure the variable in `.env`.

## 10. Dependencies

The library choices are already made (`architecture.md` ARCH-LIBS): one date library (`date-fns` + `@date-fns/tz`), one HTTP client (axios in `api-client`), one form stack (react-hook-form + zod), one PDF engine (Playwright/Chromium), one chart approach (custom SVG on d3 modules). Do not add a second of any of them. New data-layer/auth/payment dependencies are called out in the PR. Shared dependencies go in `packages/*`, not duplicated in both apps.

## 11. Git

Conventional Commits with scope: `feat(backend/accounting): …`, `fix(backend/booking): …`, `feat(desktop/crm): …`, `feat(ui): …`, `feat(web/crm): …`. Branches `feature/*`, `bugfix/*` → `dev` → `main`, only via PR. PR is done when CI is green (lint → typecheck → tests → tenant-isolation → `gen:api` no-diff → madge → build), Swagger is complete, the rules in §3 hold, and the description names the Part.

## 12. Checklist before opening a PR

**Any Part:** no `any` · no hard-coded config · commit/branch names per §11 · strings via `t()` · tests passing · `agent/PROGRESS.md` updated.
**Part A:** queries tenant-scoped via `TenantPrisma` · every route has `@RequirePermission` · money via `Money` · financial writes balanced, transactional, audited, immutable · approvals via `approvals/` · isolation + unit tests added · `pnpm gen:api` committed · Bruno request added.
**Part B/C:** tokens and components from `design.md`/`packages/ui` · nothing platform-agnostic in `apps/*` · reduced-motion and keyboard focus verified · (Part C) confirmed the component did not already exist.
