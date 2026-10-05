import { Navigate, type RouteObject } from 'react-router';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { NoPermissionState } from '@exzaestate/ui';
import { CoaPage } from './pages/CoaPage.js';
import { JournalListPage } from './pages/JournalListPage.js';
import { LedgerPage } from './pages/LedgerPage.js';
import { FinancialReportsPage } from './pages/FinancialReportsPage.js';
import { FiscalPeriodsPage } from './pages/FiscalPeriodsPage.js';
import { CashBankPage } from './pages/CashBankPage.js';

export const accountingRoutes: RouteObject[] = [
  {
    path: '/accounting',
    element: <Navigate to="/accounting/coa" replace />,
  },
  {
    path: '/accounting/coa',
    element: (
      <PermissionGate
        permission={PERMISSIONS.COA_VIEW}
        fallback={<NoPermissionState permission={PERMISSIONS.COA_VIEW} />}
      >
        <CoaPage />
      </PermissionGate>
    ),
  },
  {
    path: '/accounting/journals',
    element: (
      <PermissionGate
        permission={PERMISSIONS.JOURNAL_VIEW}
        fallback={<NoPermissionState permission={PERMISSIONS.JOURNAL_VIEW} />}
      >
        <JournalListPage />
      </PermissionGate>
    ),
  },
  {
    path: '/accounting/ledger',
    element: (
      <PermissionGate
        permission={PERMISSIONS.LEDGER_VIEW}
        fallback={<NoPermissionState permission={PERMISSIONS.LEDGER_VIEW} />}
      >
        <LedgerPage />
      </PermissionGate>
    ),
  },
  {
    path: '/accounting/ledgers',
    element: (
      <PermissionGate
        permission={PERMISSIONS.LEDGER_VIEW}
        fallback={<NoPermissionState permission={PERMISSIONS.LEDGER_VIEW} />}
      >
        <LedgerPage />
      </PermissionGate>
    ),
  },
  {
    path: '/ledgers',
    element: (
      <PermissionGate
        permission={PERMISSIONS.LEDGER_VIEW}
        fallback={<NoPermissionState permission={PERMISSIONS.LEDGER_VIEW} />}
      >
        <LedgerPage />
      </PermissionGate>
    ),
  },
  {
    path: '/accounting/reports',
    element: (
      <PermissionGate
        permission={PERMISSIONS.TRIAL_BALANCE_VIEW}
        fallback={<NoPermissionState permission={PERMISSIONS.TRIAL_BALANCE_VIEW} />}
      >
        <FinancialReportsPage />
      </PermissionGate>
    ),
  },
  {
    path: '/accounting/periods',
    element: (
      <PermissionGate
        permission={PERMISSIONS.PERIOD_VIEW}
        fallback={<NoPermissionState permission={PERMISSIONS.PERIOD_VIEW} />}
      >
        <FiscalPeriodsPage />
      </PermissionGate>
    ),
  },
  {
    path: '/accounting/cash-bank',
    element: (
      <PermissionGate
        permission={PERMISSIONS.CASHBANK_VIEW}
        fallback={<NoPermissionState permission={PERMISSIONS.CASHBANK_VIEW} />}
      >
        <CashBankPage />
      </PermissionGate>
    ),
  },
];
