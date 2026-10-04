import { Outlet, Navigate, type RouteObject } from 'react-router';
import { useAuth } from '@exzaestate/app-core';
import { authRoutes } from './auth/auth.routes.js';
import { StepUpModal } from './auth/components/StepUpModal.js';
import { SessionExpiredModal } from './auth/components/SessionExpiredModal.js';

export function RootLayout() {
  return (
    <>
      <Outlet />
      <StepUpModal />
      <SessionExpiredModal />
    </>
  );
}

export function ProtectedRoute({ children }: { children?: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-pulse rounded-full bg-slate-300 dark:bg-slate-700" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

export function DashboardPlaceholder() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        ExzaEstate Dashboard
      </h1>
      <p className="mt-2 text-sm text-slate-500">Welcome to ExzaEstate Enterprise ERP.</p>
    </div>
  );
}

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      ...authRoutes,
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/',
            element: <DashboardPlaceholder />,
          },
        ],
      },
    ],
  },
];
