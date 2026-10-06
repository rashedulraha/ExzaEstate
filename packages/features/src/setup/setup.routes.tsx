import type { RouteObject } from 'react-router';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { SetupChecklistPage } from './pages/SetupChecklistPage.js';
import { FirstLaunchWizardPage } from './first-launch/pages/FirstLaunchWizardPage.js';

export const publicSetupRoutes: RouteObject[] = [
  {
    path: '/setup/first-launch',
    element: <FirstLaunchWizardPage />,
  },
  {
    path: '/setup/wizard',
    element: <FirstLaunchWizardPage />,
  },
];

export const setupRoutes: RouteObject[] = [
  {
    path: '/setup/checklist',
    element: (
      <PermissionGate permission={PERMISSIONS.SETTINGS_VIEW}>
        <SetupChecklistPage />
      </PermissionGate>
    ),
  },
];
