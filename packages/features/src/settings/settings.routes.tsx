import type { RouteObject } from 'react-router';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { SettingsPage } from './pages/SettingsPage.js';

export const settingsRoutes: RouteObject[] = [
  {
    path: '/settings',
    element: (
      <PermissionGate permission={PERMISSIONS.SETTINGS_VIEW}>
        <SettingsPage />
      </PermissionGate>
    ),
  },
];
