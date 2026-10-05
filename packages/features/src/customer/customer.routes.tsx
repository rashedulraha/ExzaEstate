import type { RouteObject } from 'react-router';
import { CustomerListPage } from './pages/CustomerListPage.js';
import { CustomerDetailPage } from './pages/CustomerDetailPage.js';

export const customerRoutes: RouteObject[] = [
  {
    path: '/customers',
    element: <CustomerListPage />,
  },
  {
    path: '/customers/:id',
    element: <CustomerDetailPage />,
  },
];
