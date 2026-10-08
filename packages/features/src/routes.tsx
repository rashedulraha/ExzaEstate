import { useState, useEffect } from 'react';
import { Outlet, Navigate, useNavigate, useLocation, type RouteObject } from 'react-router';
import { useAuth } from '@exzaestate/app-core';
import { http } from '@exzaestate/api-client';
import { AppShell, ThemeProvider, ToastProvider } from '@exzaestate/ui';
import { authRoutes } from './auth/auth.routes.js';
import { StepUpModal } from './auth/components/StepUpModal.js';
import { SessionExpiredModal } from './auth/components/SessionExpiredModal.js';
import { SignOutModal } from './auth/components/SignOutModal.js';
import { propertyRoutes } from './property/property.routes.js';
import { crmRoutes } from './crm/crm.routes.js';
import { customerRoutes } from './customer/customer.routes.js';
import { approvalsRoutes } from './approvals/approvals.routes.js';
import { salesRoutes } from './sales/sales.routes.js';
import { collectionRoutes } from './collection/collection.routes.js';
import { accountingRoutes } from './accounting/accounting.routes.js';
import { operationsRoutes } from './operations/operations.routes.js';
import { dashboardRoutes } from './dashboard/dashboard.routes.js';
import { reportsRoutes } from './reports/reports.routes.js';
import { auditRoutes } from './audit/audit.routes.js';
import { settingsRoutes } from './settings/settings.routes.js';
import { usersRoutes } from './users/users.routes.js';
import { publicSetupRoutes, setupRoutes } from './setup/setup.routes.js';
import { migrationRoutes } from './migration/migration.routes.js';
import { licenseRoutes } from './license/license.routes.js';
import { systemAdminRoutes } from './system-admin/system-admin.routes.js';
import { ProfilePage } from './profile/pages/ProfilePage.js';
import { NotificationDrawer } from './notifications/components/NotificationDrawer.js';
import { RouteErrorBoundary } from './common/RouteErrorBoundary.js';
import { resolveCurrentRouteId } from './navigation.config.js';
import {
  isUserSuperAdmin,
  getRoleSpecificRedirect,
  useSearchShortcut,
  resolveSidebarConfig,
  buildHeaderProps,
  SearchPaletteContainer,
} from './routes.helpers.js';

export function RootLayout() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Outlet />
        <StepUpModal />
        <SessionExpiredModal />
      </ToastProvider>
    </ThemeProvider>
  );
}

export function AppRootRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isProvisioned, setIsProvisioned] = useState<boolean | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('exzaestate_workspace_provisioned');
      if (stored === 'true') return true;
    }
    return null;
  });

  useEffect(() => {
    let active = true;
    async function checkProvisioned() {
      if (isProvisioned === true) return;
      try {
        const data = await http.get<{
          provisioned?: boolean;
          data?: { provisioned?: boolean };
        }>('/api/v1/local-data/is-provisioned', {
          signal: AbortSignal.timeout(3000),
        });
        const flag = Boolean(data.provisioned || data.data?.provisioned);
        if (active) {
          setIsProvisioned(flag);
          if (flag && typeof window !== 'undefined') {
            window.localStorage.setItem('exzaestate_workspace_provisioned', 'true');
          }
        }
      } catch {
        if (active) setIsProvisioned(true);
      }
    }
    void checkProvisioned();
    return () => {
      active = false;
    };
  }, [isProvisioned]);

  if (isLoading || isProvisioned === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text">
        <div className="h-8 w-8 animate-skeleton-breathe rounded-full bg-surface-sunken" />
      </div>
    );
  }

  if (isAuthenticated) {
    if (isUserSuperAdmin(user?.companyId, user?.permissions)) {
      return <Navigate to="/system/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  if (!isProvisioned) {
    return <Navigate to="/setup/first-launch" replace />;
  }

  return <Navigate to="/auth/login" replace />;
}

export function ProtectedLayout() {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useSearchShortcut(() => setIsSearchOpen((prev) => !prev));

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await logout();
      setIsSignOutModalOpen(false);
      navigate('/auth/login', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text">
        <div className="h-8 w-8 animate-skeleton-breathe rounded-full bg-surface-sunken" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  const isSuperAdmin = isUserSuperAdmin(user?.companyId, user?.permissions);
  const roleRedirect = getRoleSpecificRedirect(isSuperAdmin, location.pathname);
  if (roleRedirect) {
    return <Navigate to={roleRedirect} replace />;
  }

  const currentRouteId = resolveCurrentRouteId(location.pathname);
  const { sidebarGroups, displayCompany } = resolveSidebarConfig(user, isSuperAdmin, navigate);
  const headerProps = buildHeaderProps(user, isSuperAdmin, {
    onSearch: () => setIsSearchOpen(true),
    onNotif: () => setIsNotifOpen(true),
    onProfile: () => navigate(isSuperAdmin ? '/system/profile' : '/profile'),
  });

  return (
    <>
      <AppShell
        companyName={displayCompany}
        currentRouteId={currentRouteId}
        sidebarGroups={sidebarGroups}
        onQuickAction={() => setIsSearchOpen(true)}
        headerProps={headerProps}
      >
        <Outlet />
      </AppShell>

      <SearchPaletteContainer
        isSuperAdmin={isSuperAdmin}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />

      <SignOutModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirm={handleConfirmSignOut}
        isSigningOut={isSigningOut}
      />
    </>
  );
}

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary isRoot />,
    children: [
      {
        path: '/',
        element: <AppRootRedirect />,
      },
      ...publicSetupRoutes,
      ...authRoutes,
      {
        element: <ProtectedLayout />,
        children: [
          {
            errorElement: <RouteErrorBoundary />,
            children: [
              ...dashboardRoutes,
              ...systemAdminRoutes,
              ...propertyRoutes,
              ...crmRoutes,
              ...customerRoutes,
              ...approvalsRoutes,
              ...salesRoutes,
              ...collectionRoutes,
              ...accountingRoutes,
              ...operationsRoutes,
              ...reportsRoutes,
              ...auditRoutes,
              {
                path: '/profile',
                element: <ProfilePage />,
              },
              ...settingsRoutes,
              ...usersRoutes,
              ...setupRoutes,
              ...migrationRoutes,
              ...licenseRoutes,
              {
                path: '*',
                element: <RouteErrorBoundary />,
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <RouteErrorBoundary isRoot />,
      },
    ],
  },
];
