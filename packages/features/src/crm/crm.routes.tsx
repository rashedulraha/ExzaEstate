import { Navigate, type RouteObject } from 'react-router';
import { LeadListPage } from './pages/LeadListPage.js';
import { FollowUpCalendarPage } from './pages/FollowUpCalendarPage.js';

export const crmRoutes: RouteObject[] = [
  {
    path: '/crm',
    element: <Navigate to="/crm/leads" replace />,
  },
  {
    path: '/crm/leads',
    element: <LeadListPage />,
  },
  {
    path: '/crm/follow-ups',
    element: <FollowUpCalendarPage />,
  },
];
