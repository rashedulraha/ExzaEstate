import type { RouteObject } from 'react-router';
import { PermissionGate } from '@exzaestate/app-core';
import { PERMISSIONS } from '@exzaestate/shared';
import { UserManagementPage } from './pages/UserManagementPage.js';
import { RoleManagementPage } from './pages/RoleManagementPage.js';

export const usersRoutes: RouteObject[] = [
  {
    path: '/users',
    element: (
      <PermissionGate permission={PERMISSIONS.USER_VIEW}>
        <UserManagementPage />
      </PermissionGate>
    ),
  },
  {
    path: '/roles',
    element: (
      <PermissionGate permission={PERMISSIONS.ROLE_VIEW}>
        <RoleManagementPage />
      </PermissionGate>
    ),
  },
];
