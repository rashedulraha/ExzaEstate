# permissions-matrix.md — ExzaEstate Roles, Permissions & Data Scope

Input for: seed data (`role_permissions`), permission tests, and the tenant-onboarding service. Guards check **permissions, never role names** (`architecture.md` ARCH-RBAC). Role names below are only seed labels; a company may rename or clone roles.

## 1. Permission naming

`<module>:<action>`, all constants live in `packages/shared/src/permissions.ts`. Actions: `view`, `create`, `edit`, `delete` (soft-delete of master data only), `approve`, `reject`, `cancel`, `refund`, `reverse`, `post`, `lock`, `export`, `print`, `manage`, `view-sensitive`. Extra named permissions: `property:override-status`, `period:close`, `period:reopen`, `approval:override`, `discount:approve-tier1`, `discount:approve-tier2`, `discount:approve-tier3`, `expense:verify`, `journal:review`, `payment:create-draft`.

**Scope** (only meaningful on `*:view` and record-owned actions): `OWN` · `TEAM` · `BRANCH` · `ALL`. A grant without a scope means the action is scope-free.

**Approval routing uses permissions:** `approval_rules.required_permission`, e.g. discount 0–2 % → `discount:approve-tier1`, >2–5 % → `tier2`, >5 % → `tier3` (`prd.md` §6.9). Tier hierarchy: holding a higher tier (`tier3`) permits approving subordinate tiers (`tier2`, `tier1`). Maker-checker: requester can never approve their own request.

## 2. Modules covered

`user, role, company, branch, department, settings, land, project, property, lead, customer, quotation, booking, agreement, cancellation, installment, payment, receipt, statement, coa, journal, ledger, cashbank, arap, period, expense, budget, vendor, procurement, development, maintenance, asset, employee, commission, document, approval, audit, report, dashboard, notification, search, license`.

## 3. Role grants (seed defaults)

Legend: **V**=view, **C**=create, **E**=edit, **D**=soft-delete, **A**=approve, **R**=reject, **X**=export, **P**=print. `[ALL]`, `[BRANCH]`, `[TEAM]`, `[OWN]` = scope. "—" = no access. 2FA column = holds at least one permission from the mandatory-2FA list (`architecture.md` §4.1).

| #   | Role                                  | Grants                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 2FA |
| --- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- |
| 1   | **Super Admin** (platform)            | Platform operations via `SystemPrisma` (no company tenant). `tenant:onboard`, `tenant:suspend`, `license:generate`, `license:verify`, `platform:health`, `audit:view-system`. **No** tenant business data access. Every platform action is audit-logged.                                                                                                                                                                                                                                                                                         | yes |
| 2   | **Managing Director (Owner / Admin)** | Full administrative, financial, and operational control. `user:manage`, `role:manage`, `settings:manage`, `audit:view`, `approval:override` (Joint Control with GM); company/branch/department V C E D; master data V C E D [ALL]; `numbering` & `approval-matrix` config; `discount:approve-tier1`, `discount:approve-tier2`, `discount:approve-tier3`; A R on all bookings, cancellations, refunds, expenses, procurement, journals; reports & dashboard V X P [ALL]. In single-operator mode, bypasses multi-user maker-checker restrictions. | yes |
| 3   | **General Manager**                   | Operational leadership across sales, projects, and expenses. V [ALL] sales, collection, expense, project, property inventory; `approval:override` (Joint Control with MD); `discount:approve-tier1`, `discount:approve-tier2`; A R on bookings, cancellations, expenses (within GM threshold), procurement, maintenance; reports V X [ALL]; dashboard [ALL].                                                                                                                                                                                     | yes |
| 4   | **Accountant**                        | Complete finance & books. Payment V C E(draft) `post` [ALL]; receipt V P; `payment:refund`, `payment:reverse`; ledger, statements, trial balance, arap V X P [ALL]; `journal:review`, `journal:post`; `period:close`; `expense:verify`; cashbank V C E; vendor bill V C; reports (financial) V X P [ALL]. Cannot manage users/roles.                                                                                                                                                                                                             | yes |
| 5   | **Executive (Sales & Site)**          | Frontline operations. CRM leads, follow-ups, customer profiles V C E [TEAM/OWN]; quotation, booking V C [TEAM/OWN]; property inventory V [ALL]; site task & progress updates V C [BRANCH]; agreement C V; `payment:create-draft` (submits booking money payment requests for Accountant posting); reports (sales/activity) V X [TEAM]. Cannot view general ledgers, post payments, or process refunds.                                                                                                                                           | no  |

> **Note on Custom Roles:** Companies may define additional custom roles (e.g. standalone Storekeeper, Broker, or Auditor) directly from the Settings UI with customized permission combinations.

## 4. Rules the tests must enforce

1. Every permission grant in this table exists as a constant in `packages/shared`; every backend route declares `@RequirePermission`.
2. Executive: cannot open another executive's lead under `[OWN]` scope (403/404), cannot read `/ledgers`, cannot post payments, cannot call refund.
3. Accountant can post a payment; Managing Director / Admin can change role permissions; nobody else can.
4. Overriding a pending approval (`approval:override`) strictly requires joint confirmation by two distinct users holding the permission (MD + GM).
5. Removing a role from a user takes effect on that user's **next** request (cache key deleted).
6. Scope test per scoped module: OWN, TEAM, BRANCH, ALL each return the correct row set for a seeded fixture.
7. 2FA is enforced for every user holding a permission from the mandatory list (`architecture.md` §4.1), including Managing Director, General Manager, Accountant, and Super Admin.
