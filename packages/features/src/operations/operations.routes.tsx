import { Navigate, type RouteObject } from 'react-router';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { NoPermissionState } from '@exzaestate/ui';
import { ExpenseListPage } from './pages/ExpenseListPage.js';
import { VendorListPage } from './pages/VendorListPage.js';
import { CommissionPage } from './pages/CommissionPage.js';
import { BudgetListPage } from './pages/BudgetListPage.js';
import { BookingTransferPage } from './pages/BookingTransferPage.js';
import { ProjectProfitabilityPage } from './pages/ProjectProfitabilityPage.js';

export const operationsRoutes: RouteObject[] = [
  {
    path: '/operations',
    element: <Navigate to="/operations/expenses" replace />,
  },
  {
    path: '/operations/expenses',
    element: (
      <PermissionGate
        permission={PERMISSIONS.EXPENSE_VIEW}
        fallback={<NoPermissionState permission={PERMISSIONS.EXPENSE_VIEW} />}
      >
        <ExpenseListPage />
      </PermissionGate>
    ),
  },
  {
    path: '/operations/vendors',
    element: (
      <PermissionGate
        permission={PERMISSIONS.VENDOR_VIEW}
        fallback={<NoPermissionState permission={PERMISSIONS.VENDOR_VIEW} />}
      >
        <VendorListPage />
      </PermissionGate>
    ),
  },
  {
    path: '/operations/commissions',
    element: (
      <PermissionGate
        permission={PERMISSIONS.COMMISSION_VIEW}
        fallback={<NoPermissionState permission={PERMISSIONS.COMMISSION_VIEW} />}
      >
        <CommissionPage />
      </PermissionGate>
    ),
  },
  {
    path: '/operations/budgets',
    element: (
      <PermissionGate
        permission={PERMISSIONS.BUDGET_VIEW}
        fallback={<NoPermissionState permission={PERMISSIONS.BUDGET_VIEW} />}
      >
        <BudgetListPage />
      </PermissionGate>
    ),
  },
  {
    path: '/operations/transfers',
    element: (
      <PermissionGate
        permission={PERMISSIONS.BOOKING_TRANSFER}
        fallback={<NoPermissionState permission={PERMISSIONS.BOOKING_TRANSFER} />}
      >
        <BookingTransferPage />
      </PermissionGate>
    ),
  },
  {
    path: '/operations/profitability',
    element: (
      <PermissionGate
        permission={PERMISSIONS.REPORT_VIEW}
        fallback={<NoPermissionState permission={PERMISSIONS.REPORT_VIEW} />}
      >
        <ProjectProfitabilityPage />
      </PermissionGate>
    ),
  },
];
