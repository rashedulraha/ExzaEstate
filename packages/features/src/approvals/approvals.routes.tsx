import type { RouteObject } from 'react-router';
import { PERMISSIONS } from '@exzaestate/shared';
import { PermissionGate } from '@exzaestate/app-core';
import { ApprovalInboxPage } from './pages/ApprovalInboxPage.js';

export const approvalsRoutes: RouteObject[] = [
  {
    path: 'approvals',
    element: (
      <PermissionGate permission={PERMISSIONS.APPROVAL_VIEW}>
        <ApprovalInboxPage />
      </PermissionGate>
    ),
  },
];
