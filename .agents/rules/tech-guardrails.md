# ExzaEstate Strict Tech Guardrails & Invariants

This rule is enforced across all tasks. Under no circumstances may any AI agent violate these invariants.

## 1. Prisma 7 Multi-File Schema & Driver Adapter Architecture

- **Multi-File Schemas:** MUST use `apps/backend/prisma/schema/*.prisma` (e.g. `base.prisma`, `auth.prisma`, `property.prisma`).
- **NEVER** create a single monolithic `schema.prisma`.
- **NEVER** put `url = env("DATABASE_URL")` or connection strings inside any `.prisma` file.
- **Prisma Config:** Connection URL and schema path MUST be configured in `apps/backend/prisma.config.ts` using `defineConfig` from `@prisma/config`.
- **Runtime Driver Adapter:** Always instantiate Prisma Client using `@prisma/adapter-pg` and `pg.Pool`.
- **RLS & Multi-Tenancy:** NEVER use raw `prisma.$transaction()` on tenant tables. ALWAYS use `tenantDb.transaction(async (tx) => ...)` to set `SET LOCAL app.current_company_id`.

## 2. NestJS 12 (ESM) Relative Imports

- **Mandatory Extension:** ALWAYS append `.js` to all relative imports (e.g. `import { BookingService } from './booking.service.js';`).
- **No CommonJS:** NEVER use `require()` or `module.exports`.

## 3. Tailwind CSS v4 (CSS-First)

- **Zero JS Config:** NEVER create `tailwind.config.js` or `tailwind.config.ts`.
- **Theme Definition:** ALWAYS use `@import "tailwindcss";` and `@theme { ... }` in CSS with Meridian tokens from `agent/design.md`.

## 4. React 19 Standards

- **No `forwardRef`:** React 19 natively passes `ref` as a prop. NEVER use `React.forwardRef()`.
- **No Mock Data in UI:** React components and pages must NEVER hardcode mock data arrays (`const mockData = [...]`). UI strictly consumes generated TanStack Query hooks backed by real database seed data (`pnpm db:seed:demo`).

## 5. Currency & Numbers (ARCH-MONEY)

- **Integer Paisa:** NEVER use JavaScript `Number` or floating point for financial calculations.
- **Storage & Transport:** Stored as integer paisa using `BigInt` in Prisma; transported over API as `string`; formatted with `formatMoney` (`৳5,00,000`).

## 6. Pre-Completion Terminal Verification

Before concluding any task turn, the agent MUST run:

```bash
pnpm prisma validate
pnpm oxlint
pnpm typecheck
```
