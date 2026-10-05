import { useEffect } from 'react';
import { useNavigate, type RouteObject } from 'react-router';
import { useAuth } from '@exzaestate/app-core';
import { LoginPage } from './pages/LoginPage.js';

function AuthLoginRoute() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return <LoginPage onSuccess={() => navigate('/dashboard', { replace: true })} />;
}

export const authRoutes: RouteObject[] = [
  {
    path: '/auth/login',
    element: <AuthLoginRoute />,
  },
];
