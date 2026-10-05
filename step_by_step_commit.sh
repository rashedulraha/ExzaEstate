#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo " Starting Step-by-Step Granular Git Commits for ExzaEstate"
echo "=========================================================="

commit_if_changed() {
  local msg="$1"
  if ! git diff --cached --quiet; then
    git commit -m "$msg"
  else
    echo "  (No changes staged for: $msg, skipping)"
  fi
}

# 1. Desktop Shell Setup, Shared Localisation & Tooling
echo ">>> [1/12] Committing Desktop Shell, Font Assets & Tooling..."
git add apps/desktop/index.html \
        apps/desktop/package.json \
        apps/desktop/src/main.tsx \
        apps/desktop/src/index.css \
        apps/desktop/src/vite-env.d.ts \
        apps/desktop/vite.config.ts \
        apps/desktop/public/ \
        apps/web/public/ \
        packages/shared/src/format.ts \
        pnpm-lock.yaml \
        scripts/check-no-mocks-in-production.mjs 2>/dev/null || true
commit_if_changed "chore(desktop): configure desktop client shell, font assets, and tooling"

# 2. Meridian Design Tokens & Signature UI Components
echo ">>> [2/12] Committing UI Tokens & Signature Components..."
git add packages/ui/ 2>/dev/null || true
commit_if_changed "feat(ui): implement Meridian design system tokens, signature components, and SVG charts (B1.2)"

# 3. Auth Screens, Step-Up Security & Session Modals
echo ">>> [3/12] Committing Auth Feature & Step-Up Security..."
git add packages/features/src/auth/
commit_if_changed "feat(auth): enhance authentication screens, step-up security, and session modals (B1.1)"

# 4. Property Inventory & Cadastral Planning
echo ">>> [4/12] Committing Property Inventory & Cadastral Views..."
git add packages/features/src/property/
commit_if_changed "feat(property): implement property inventory, cadastral plan view, and status overrides (B1.3)"

# 5. CRM Leads & Customer 360
echo ">>> [5/12] Committing CRM Leads & Customer 360..."
git add packages/features/src/crm/ \
        packages/features/src/customer/
commit_if_changed "feat(crm): implement lead pipelines, follow-ups, and Customer 360 dossiers (B2)"

# 6. Sales, Quotations, Approvals & Booking Wizard
echo ">>> [6/12] Committing Sales, Approvals & Booking Wizard..."
git add packages/features/src/sales/ \
        packages/features/src/approvals/
commit_if_changed "feat(sales): implement sales quotations, approvals, and 5-tier booking wizard (B3)"

# 7. Collection, Money Receipts & Payment Terrace
echo ">>> [7/12] Committing Collection, Receipts & Payment Terrace..."
git add packages/features/src/collection/
commit_if_changed "feat(collection): implement payment receipts, cheque clearance, and aging statements (B4)"

# 8. Accounting, COA, Journals & Periods
echo ">>> [8/12] Committing Accounting, Chart of Accounts & Journals..."
git add packages/features/src/accounting/
commit_if_changed "feat(accounting): implement chart of accounts, journal vouchers, and period locks (B5)"

# 9. Operations, Expenses, Vendors, Budgets & Transfers
echo ">>> [9/12] Committing Operations, Expenses, Vendors & Transfers..."
git add packages/features/src/operations/
commit_if_changed "feat(operations): implement expense management, vendor bills, and booking transfers (B6)"

# 10. Dashboard, Reports, Search, Notifications & Audit
echo ">>> [10/12] Committing Dashboard, Reports, Search & Audit..."
git add packages/features/src/dashboard/ \
        packages/features/src/reports/ \
        packages/features/src/search/ \
        packages/features/src/notifications/ \
        packages/features/src/audit/
commit_if_changed "feat(analytics): implement executive dashboard, financial reports, search palette, and audit viewer (B7)"

# 11. Settings, Users & Roles, Setup Checklist & Migration Wizard
echo ">>> [11/12] Committing Settings, Users, Setup & Migration Wizard..."
git add packages/features/src/settings/ \
        packages/features/src/users/ \
        packages/features/src/setup/ \
        packages/features/src/migration/ \
        packages/features/src/routes.tsx \
        packages/features/src/index.ts
commit_if_changed "feat(settings): implement system policies, RBAC editor, setup checklist, and migration wizard (B8)"

# 12. Documentation, Task Checklist & Execution Ledger
echo ">>> [12/12] Committing Project Documentation & Execution Ledger..."
git add agent/PROGRESS.md \
        agent/task.md \
        agent/rules.md
commit_if_changed "docs: update execution progress tracker, task checklist, and architectural ledger for B1-B8"

echo "=========================================================="
echo " All Granular Commits Processed Successfully!"
echo "=========================================================="
