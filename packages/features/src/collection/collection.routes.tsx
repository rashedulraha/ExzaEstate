import type { RouteObject } from 'react-router';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { PaymentListPage } from './pages/PaymentListPage.js';
import { InstallmentSchedulePage } from './pages/InstallmentSchedulePage.js';
import { ChequeManagementPage } from './pages/ChequeManagementPage.js';
import { CustomerStatementPage } from './pages/CustomerStatementPage.js';
import { AgingDashboardPage } from './pages/AgingDashboardPage.js';

export const collectionRoutes: RouteObject[] = [
  {
    path: 'collection/payments',
    element: (
      <PermissionGate permission={PERMISSIONS.PAYMENT_VIEW}>
        <PaymentListPage />
      </PermissionGate>
    ),
  },
  {
    path: 'collection/installments',
    element: (
      <PermissionGate permission={PERMISSIONS.INSTALLMENT_VIEW}>
        <InstallmentSchedulePage />
      </PermissionGate>
    ),
  },
  {
    path: 'collection/cheques',
    element: (
      <PermissionGate permission={PERMISSIONS.PAYMENT_VIEW}>
        <ChequeManagementPage />
      </PermissionGate>
    ),
  },
  {
    path: 'collection/statements',
    element: (
      <PermissionGate permission={PERMISSIONS.STATEMENT_VIEW}>
        <CustomerStatementPage />
      </PermissionGate>
    ),
  },
  {
    path: 'collection/aging',
    element: (
      <PermissionGate permission={PERMISSIONS.STATEMENT_VIEW}>
        <AgingDashboardPage />
      </PermissionGate>
    ),
  },
];
