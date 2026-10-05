import type { RouteObject } from 'react-router';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { SetupChecklistPage } from './pages/SetupChecklistPage.js';

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
