# super-admin-tasks.md — Super Admin Console Dashboard Implementation Plan

> **Scope:** Dedicated Platform Administration Console for Exzazon Team (`SUPER_ADMIN`).
> **Authority & Precedence:** Follows `AGENTS.md`, `agent/design.md`, `agent/permissions-matrix.md`, and `.agents/skills/`.
> **Styling Invariant:** 100% theme tokens from `packages/ui/src/styles/theme.css`. Zero hardcoded arbitrary colors or hex values.

---

## Architecture Overview

```
                      ┌───────────────────────────────────────────────┐
                      │              SUPER_ADMIN Login                │
                      │   (companyId: 00000000-...-000000000000)      │
                      └──────────────────────┬────────────────────────┘
                                             │
                        ┌────────────────────┴───────────────────┐
                        ▼                                        ▼
      ┌───────────────────────────────────┐   ┌───────────────────────────────────┐
      │   Platform Super Admin Console    │   │  Tenant Client ERP (MD / Staff)   │
      │       /system/dashboard           │   │            /dashboard             │
      ├───────────────────────────────────┤   ├───────────────────────────────────┤
      │ • Tenants Directory (Companies)   │   │ • Property Inventory & Units      │
      │ • Onboard New Tenant Wizard       │   │ • Bookings, Sales & Quotations    │
      │ • Ed25519 License Key Generator   │   │ • Collections, Receipts & Ledgers │
      │ • Platform Server Health & Queues │   │ • Approvals Matrix & Staff Users  │
      │ • Platform Infrastructure Audit   │   │ • Executive Management Cockpit    │
      └───────────────────────────────────┘   └───────────────────────────────────┘
```

---

## Phase Breakdown & Execution Tasks

### Phase 1: Planning & Contract Verification

- [x] **Task 1.1:** Create `agent/super-admin-tasks.md` tracking document.
- [x] **Task 1.2:** Inspect backend endpoints & data schemas for `/api/v1/system/tenants`, `/api/v1/system/licenses`, and `/api/v1/system/health`.

### Phase 2: System Admin Data Hook & Schemas

- [x] **Task 2.1:** Define TypeScript interfaces in `packages/features/src/system-admin/schemas/system-admin.schema.ts`.
- [x] **Task 2.2:** Build `useSystemAdmin` custom hook in `packages/features/src/system-admin/hooks/useSystemAdmin.ts` using `customInstance` with error handling and optimistic mutations.

### Phase 3: Presentation Components (Theme Tokens Only)

- [x] **Task 3.1:** Create `SystemHealthCardGrid.tsx` — live server telemetry, uptime, memory, database pool status.
- [x] **Task 3.2:** Create `TenantDirectoryTable.tsx` — company table with status badges (`ACTIVE` / `SUSPENDED`), code, search, and action menus.
- [x] **Task 3.3:** Create `OnboardTenantModal.tsx` — accessible form modal to provision a new company with its initial Managing Director.
- [x] **Task 3.4:** Create `LicenseGeneratorModal.tsx` — modal to generate signed Ed25519 license keys with hardware machine fingerprinting and copy/download feature.
- [x] **Task 3.5:** Create `TenantDetailModal.tsx` — inspect tenant branches, company details, and suspension controls.

### Phase 4: Master Dashboard Page & Navigation Routing

- [x] **Task 4.1:** Build `PlatformSuperAdminDashboardPage.tsx` combining telemetry, tenant directory, and license quick-action.
- [x] **Task 4.2:** Create `packages/features/src/system-admin/system-admin.routes.tsx`.
- [x] **Task 4.3:** Update `packages/features/src/navigation.config.tsx` with `createSystemAdminSidebarNavGroups`.
- [x] **Task 4.4:** Update `packages/features/src/routes.tsx`:
  - Route Super Admin (`companyId === '00000000-0000-0000-0000-000000000000'`) to `/system/dashboard`.
  - In `ProtectedLayout`, switch sidebar and header to Platform mode when Super Admin is active.

### Phase 5: Verification & Quality Assurance

- [x] **Task 5.1:** TypeScript typecheck (`pnpm typecheck` — 0 errors).
- [x] **Task 5.2:** Linter verification (`pnpm oxlint` — 0 errors on system-admin).
- [x] **Task 5.3:** Production bundle verification (`vite build` — 528ms clean build).
- [x] **Task 5.4:** Log completion in `agent/PROGRESS.md` and report back.

### Phase 6: Bespoke UI Overhaul, Command Palette & Sidebar Polish

- [x] **Task 6.1:** Fix Sidebar Collapse/Expand Toggle — restored visible `PanelLeftOpen`/`PanelLeftClose` button in `Header.tsx`, left edge hover peek trigger in `AppShell.tsx`, and `⌘[` keyboard shortcut.
- [x] **Task 6.2:** Super Admin Dedicated Command Palette (`PlatformCommandPalette.tsx`) — platform-scoped search across real tenants, licenses, and direct operations (Onboard Company, Generate License, Telemetry, Theme toggle) with no tenant redirect contamination.
- [x] **Task 6.3:** Real Database Endpoints for Licenses & Audit Logs — added `GET /api/v1/system/licenses` in `SystemLicenseController` and `GET /api/v1/system/tenants/audit-logs` in `SystemTenantController`. Zero mock data.
- [x] **Task 6.4:** Elevated Super Admin Console UI — added `ClusterTelemetryConsole` (memory usage progress bar, BullMQ jobs, Postgres RLS engine state), `PlatformLicensesTable`, `PlatformAuditLogsTable`, and tabbed workstation.
- [x] **Task 6.5:** Strict Theme Tokens & Clean Typography — 100% tokens from `theme.css`, `tabular-nums` on all numbers/dates, removed repetitive icon boxes, 0 lint errors, 100% test coverage preserved.
