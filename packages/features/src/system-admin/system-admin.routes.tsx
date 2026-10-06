import type { RouteObject } from 'react-router';
import { PlatformSuperAdminDashboardPage } from './pages/PlatformSuperAdminDashboardPage.js';

export const systemAdminRoutes: RouteObject[] = [
  {
    path: '/system/dashboard',
    element: <PlatformSuperAdminDashboardPage />,
  },
  {
    path: '/system/tenants',
    element: <PlatformSuperAdminDashboardPage />,
  },
  {
    path: '/system/licenses',
    element: <PlatformSuperAdminDashboardPage />,
  },
  {
    path: '/system/health',
    element: <PlatformSuperAdminDashboardPage />,
  },
];
