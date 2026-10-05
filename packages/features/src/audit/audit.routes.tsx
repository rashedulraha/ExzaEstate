import type { RouteObject } from 'react-router';
import { AuditLogViewerPage } from './pages/AuditLogViewerPage.js';

export const auditRoutes: RouteObject[] = [
  {
    path: '/audit',
    element: <AuditLogViewerPage />,
  },
];
