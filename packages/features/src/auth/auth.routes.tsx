import type { RouteObject } from 'react-router';
import { LoginPage } from './pages/LoginPage.js';

export const authRoutes: RouteObject[] = [
  {
    path: '/auth/login',
    element: <LoginPage />,
  },
];
