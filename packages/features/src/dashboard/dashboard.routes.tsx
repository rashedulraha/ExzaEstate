import type { RouteObject } from 'react-router';
import { ExecutiveDashboardPage } from './pages/ExecutiveDashboardPage.js';

export const dashboardRoutes: RouteObject[] = [
  {
    path: '/dashboard',
    element: <ExecutiveDashboardPage />,
  },
];
