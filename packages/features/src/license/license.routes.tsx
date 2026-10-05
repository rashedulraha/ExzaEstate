import type { RouteObject } from 'react-router';
import { LicenseManagementPage } from './pages/LicenseManagementPage.js';

export const licenseRoutes: RouteObject[] = [
  {
    path: 'settings/license',
    element: <LicenseManagementPage />,
  },
];
