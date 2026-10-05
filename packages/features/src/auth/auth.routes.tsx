import { useEffect } from 'react';
import { useNavigate, type RouteObject } from 'react-router';
import { useAuth } from '@exzaestate/app-core';
import { LoginPage } from './pages/LoginPage.js';

function AuthLoginRoute() {
  const navigate = useNavigate();
  const { isAuthenticated, dismissSessionExpired } = useAuth();

  useEffect(() => {
    dismissSessionExpired();
  }, [dismissSessionExpired]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <LoginPage
      defaultEmail="md@exzaestate.com"
      defaultPassword="ExzaEstate@2026!"
      onSuccess={() => navigate('/dashboard', { replace: true })}
    />
  );
}

export const authRoutes: RouteObject[] = [
  {
    path: '/auth/login',
    element: <AuthLoginRoute />,
  },
];
