import type { RouteObject } from 'react-router';
import { PlatformSuperAdminDashboardPage } from './pages/PlatformSuperAdminDashboardPage.js';
import { PlatformTenantsPage } from './pages/PlatformTenantsPage.js';
import { PlatformLicensesPage } from './pages/PlatformLicensesPage.js';
import { PlatformHealthPage } from './pages/PlatformHealthPage.js';
import { PlatformAuditPage } from './pages/PlatformAuditPage.js';
import { PlatformProfilePage } from './pages/PlatformProfilePage.js';

export const systemAdminRoutes: RouteObject[] = [
  {
    path: '/system/dashboard',
    element: <PlatformSuperAdminDashboardPage />,
  },
  {
    path: '/system/tenants',
    element: <PlatformTenantsPage />,
  },
  {
    path: '/system/licenses',
    element: <PlatformLicensesPage />,
  },
  {
    path: '/system/health',
    element: <PlatformHealthPage />,
  },
  {
    path: '/system/audit',
    element: <PlatformAuditPage />,
  },
  {
    path: '/system/profile',
    element: <PlatformProfilePage />,
  },
];
