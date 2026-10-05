import type { RouteObject } from 'react-router';
import { ReportsHubPage } from './pages/ReportsHubPage.js';
import { TrialBalanceReportPage } from './pages/TrialBalanceReportPage.js';
import { BalanceSheetReportPage } from './pages/BalanceSheetReportPage.js';
import { IncomeStatementReportPage } from './pages/IncomeStatementReportPage.js';
import { SalesReportPage } from './pages/SalesReportPage.js';
import { CollectionReportPage } from './pages/CollectionReportPage.js';
import { InventoryReportPage } from './pages/InventoryReportPage.js';

export const reportsRoutes: RouteObject[] = [
  {
    path: '/reports',
    element: <ReportsHubPage />,
  },
  {
    path: '/reports/trial-balance',
    element: <TrialBalanceReportPage />,
  },
  {
    path: '/reports/balance-sheet',
    element: <BalanceSheetReportPage />,
  },
  {
    path: '/reports/income-statement',
    element: <IncomeStatementReportPage />,
  },
  {
    path: '/reports/sales',
    element: <SalesReportPage />,
  },
  {
    path: '/reports/collection',
    element: <CollectionReportPage />,
  },
  {
    path: '/reports/inventory',
    element: <InventoryReportPage />,
  },
];
