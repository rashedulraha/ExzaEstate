import type { RouteObject } from 'react-router';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { MigrationWizardPage } from './pages/MigrationWizardPage.js';

export const migrationRoutes: RouteObject[] = [
  {
    path: '/migration/wizard',
    element: (
      <PermissionGate permission={PERMISSIONS.SETTINGS_MANAGE}>
        <MigrationWizardPage />
      </PermissionGate>
    ),
  },
];
