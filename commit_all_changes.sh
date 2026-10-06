#!/usr/bin/env bash
set -e

echo "=== Starting step-by-step atomic Git commits ==="

# 1. Skills & Tooling configs
echo "--> 1. Committing design skills & tooling configs..."
git add .agents/skills/ skills-lock.json
git commit -m "chore(skills): add UI/UX and typography design skills and lockfile" || true

# 2. Shared package updates
echo "--> 2. Committing shared package utilities & localization..."
git add packages/shared/src/format.ts packages/shared/src/format.spec.ts packages/shared/src/i18n/en.json
git commit -m "feat(shared): enhance money formatting and add localization strings" || true

# 3. UI Tokens, Meridian Theme, and Primitives
echo "--> 3. Committing UI design tokens, theme system, and primitives..."
git add packages/ui/src/styles/theme.css \
        packages/ui/src/tokens/tokens.ts \
        packages/ui/src/tokens/typography.spec.ts \
        packages/ui/src/theme/ \
        packages/ui/src/components/brand/ExzaLogo.tsx \
        packages/ui/src/components/button/Button.tsx \
        packages/ui/src/components/toast/Toast.tsx \
        packages/ui/src/components/toast/Toast.spec.tsx \
        packages/ui/src/states/NotFoundState.tsx \
        agent/design.md
git commit -m "feat(ui): implement Meridian design system tokens, typography, and theme provider" || true

# 4. UI Charts, Plan View, and State Primitives
echo "--> 4. Committing UI D3 financial charts, plan view, and UI specs..."
git add packages/ui/src/charts/AgingStrip.tsx \
        packages/ui/src/charts/CashFlowLine.tsx \
        packages/ui/src/charts/KpiSparklineCard.tsx \
        packages/ui/src/charts/PipelineFunnel.tsx \
        packages/ui/src/charts/ProfitWaterfall.tsx \
        packages/ui/src/components/plan-view/PlanView.tsx \
        packages/ui/src/components/plan-view/PlanViewPlotCell.tsx \
        packages/ui/src/index.ts \
        packages/ui/src/ui.spec.tsx
git commit -m "feat(ui): add D3-based financial charts, plan view cells, and state primitives" || true

# 5. UI Layout, Resizer, Header, and Sidebar
echo "--> 5. Committing layout shell, resizable sidebar, and header controls..."
git add packages/ui/src/layout/AppShell.tsx \
        packages/ui/src/layout/Breadcrumbs.tsx \
        packages/ui/src/layout/CommandPalette.tsx \
        packages/ui/src/layout/Header.tsx \
        packages/ui/src/layout/Sidebar.tsx \
        packages/ui/src/layout/SidebarResizer.tsx \
        packages/ui/src/layout/SidebarSections.tsx \
        packages/ui/src/layout/sidebar.constants.tsx \
        packages/ui/src/layout/useSidebarResize.ts
git rm -f step_by_step_commit.sh 2>/dev/null || true
git commit -m "feat(ui): enhance AppShell with resizable sidebar, peek trigger, and header controls" || true

# 6. App-Core & API Client Session & Error Handling
echo "--> 6. Committing app-core and api-client enhancements..."
git add packages/api-client/src/http.ts \
        packages/app-core/src/errors/index.tsx \
        packages/app-core/src/permissions/index.tsx \
        packages/app-core/src/session/index.tsx \
        packages/app-core/src/session/types.ts
git commit -m "feat(app-core): add platform session state, permission guards, and API client interceptor" || true

# 7. Backend Local Standalone & Seed Scripts
echo "--> 7. Committing backend local provisioning and seed scripts..."
git add apps/backend/src/modules/local-data/dto/local-data.dto.ts \
        apps/backend/src/modules/local-data/local-data.module.ts \
        apps/backend/src/modules/local-data/local-provisioning.service.ts \
        apps/backend/src/platform/tenant-provisioning/demo-seed/steps/demo-staff.step.ts \
        apps/backend/src/platform/tenant-provisioning/steps/managing-director.step.ts \
        apps/backend/test/local/local-provisioning.spec.ts \
        apps/backend/prisma/check-users.ts \
        apps/backend/prisma/enable-demo-2fa.ts \
        apps/backend/prisma/sanitize-database-names.ts \
        apps/backend/prisma/setup-super-admin.ts
git commit -m "feat(backend): implement local data provisioning and demo seed scripts" || true

# 8. Backend Auth, Tenant DB, and System Realm
echo "--> 8. Committing backend authentication, tenant DB context, and system realm..."
git add .env.example \
        apps/backend/src/common/guards/jwt-auth.guard.ts \
        apps/backend/src/common/guards/jwt-auth.utils.ts \
        apps/backend/src/common/guards/permissions.guard.ts \
        apps/backend/src/config/config.service.ts \
        apps/backend/src/config/env.schema.ts \
        apps/backend/src/database/tenant-db.service.ts \
        apps/backend/src/modules/auth/auth.service.ts \
        apps/backend/src/modules/auth/auth.helpers.ts \
        apps/backend/src/modules/auth/permission.service.ts \
        apps/backend/src/modules/auth/token.service.ts \
        apps/backend/src/modules/license/license.service.ts \
        apps/backend/src/modules/license/system-license.controller.ts \
        apps/backend/src/modules/system-admin/system-tenant.controller.ts \
        apps/backend/src/modules/system-admin/system-tenant.service.ts
git commit -m "feat(backend): add authentication token rotation, tenant DB context, and system endpoints" || true

# 9. Features: Auth, Setup & First-Launch Wizard
echo "--> 9. Committing first-launch wizard and sign-out modal..."
git add packages/features/src/auth/auth.spec.tsx \
        packages/features/src/auth/index.ts \
        packages/features/src/auth/pages/LoginPage.tsx \
        packages/features/src/auth/components/SignOutModal.tsx \
        packages/features/src/auth/components/SignOutModal.spec.tsx \
        packages/features/src/setup/first-launch/components/FirstLaunchSummary.tsx \
        packages/features/src/setup/first-launch/components/LocalSetupSection.tsx \
        packages/features/src/setup/first-launch/components/LocalCompanyForm.tsx \
        packages/features/src/setup/first-launch/components/LocalCompanySections.tsx \
        packages/features/src/setup/first-launch/first-launch.spec.tsx \
        packages/features/src/setup/first-launch/hooks/useFirstLaunch.ts \
        packages/features/src/setup/first-launch/hooks/useFirstLaunch.helpers.ts \
        packages/features/src/setup/first-launch/pages/FirstLaunchWizardPage.tsx \
        packages/features/src/setup/first-launch/schemas/first-launch.schema.ts \
        packages/features/src/setup/setup.routes.tsx
git commit -m "feat(features): add first-launch setup wizard and sign-out confirmation modal" || true

# 10. Features: Universal Search & Command Palette
echo "--> 10. Committing universal search command palette..."
git add packages/features/src/search/components/GlobalSearchCommandPalette.tsx \
        packages/features/src/search/components/SearchPaletteResults.tsx \
        packages/features/src/search/components/search-palette.constants.tsx \
        packages/features/src/search/hooks/useGlobalSearch.ts \
        packages/features/src/search/search.spec.tsx
git commit -m "feat(features): implement universal search palette and entity lookup hook" || true

# 11. Features: Property Cadastral, Stacking & Inventory
echo "--> 11. Committing property cadastral map and inventory inspection..."
git add packages/features/src/property/components/PropertyDrawer.tsx \
        packages/features/src/property/components/PropertyDrawerSections.tsx \
        packages/features/src/property/components/PropertyPlanView.tsx \
        packages/features/src/property/components/PropertyCadastralMap.tsx \
        packages/features/src/property/components/PropertyStackingPlan.tsx \
        packages/features/src/property/pages/PropertyKpiCards.tsx \
        packages/features/src/property/pages/PropertyListComponents.tsx \
        packages/features/src/property/pages/PropertyListPage.tsx \
        packages/features/src/property/index.ts
git commit -m "feat(features): add property cadastral map, stacking plan, and inventory inspection drawer" || true

# 12. Features: CRM, Sales, Collections & Audit Views
echo "--> 12. Committing CRM, sales, collections, and audit history views..."
git add packages/features/src/crm/hooks/useLeadList.ts \
        packages/features/src/crm/pages/LeadListPage.tsx \
        packages/features/src/customer/pages/CustomerListPage.tsx \
        packages/features/src/sales/pages/BookingListPage.tsx \
        packages/features/src/sales/pages/QuotationListPage.tsx \
        packages/features/src/collection/collection.routes.tsx \
        packages/features/src/collection/components/aging/AgingStrip.tsx \
        packages/features/src/collection/components/receipts/MoneyReceiptModal.tsx \
        packages/features/src/audit/components/AuditDetailDrawer.tsx \
        packages/features/src/audit/components/EntityHistoryDrawer.tsx \
        packages/features/src/audit/pages/audit-columns.tsx \
        packages/features/src/notifications/components/NotificationDrawer.tsx \
        packages/features/src/notifications/hooks/useNotifications.ts
git commit -m "feat(features): add CRM leads, sales bookings, collection aging, and audit history drawers" || true

# 13. Features: Executive Dashboard & Reports Hub
echo "--> 13. Committing executive dashboard analytics and reports hub..."
git add packages/features/src/dashboard/components/DashboardChartsSection.tsx \
        packages/features/src/dashboard/components/ExecutiveKpiStrip.tsx \
        packages/features/src/dashboard/components/ExecutiveActionCenter.tsx \
        packages/features/src/dashboard/components/InventoryAbsorptionStrip.tsx \
        packages/features/src/dashboard/pages/ExecutiveDashboardPage.tsx \
        packages/features/src/reports/index.ts \
        packages/features/src/reports/pages/ReportsHubPage.tsx \
        packages/features/src/reports/components/QuickGenerateModal.tsx \
        packages/features/src/reports/components/RecentExportsDrawer.tsx \
        packages/features/src/reports/components/ReportCard.tsx \
        packages/features/src/reports/components/ReportsDirectoryView.tsx \
        packages/features/src/reports/components/ReportsFilterBar.tsx \
        packages/features/src/reports/components/ReportsMetricsBar.tsx \
        packages/features/src/reports/components/ReportsTableView.tsx \
        packages/features/src/reports/reports-hub.spec.tsx \
        packages/features/src/reports/reports.catalog.ts \
        packages/features/src/reports/reports.types.ts
git commit -m "feat(features): implement executive dashboard analytics and enterprise reports hub" || true

# 14. Features: Super Admin Console & Navigation Config
echo "--> 14. Committing platform Super Admin console and routes..."
git add packages/features/src/common/ \
        packages/features/src/navigation.config.tsx \
        packages/features/src/system-admin/ \
        packages/features/src/routes.tsx \
        packages/features/src/routes.helpers.tsx \
        packages/features/src/index.ts \
        agent/super-admin-tasks.md
git commit -m "feat(features): implement Platform Super Admin console, Ed25519 licensing, and routing" || true

# 15. Progress Documentation
echo "--> 15. Committing documentation progress updates and commit runner script..."
git add agent/PROGRESS.md commit_all_changes.sh
git commit -m "docs(progress): log completed Part B desktop tasks and Super Admin implementation" || true

echo "=== All atomic commits completed successfully! ==="
