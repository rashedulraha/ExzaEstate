import { useState } from 'react';
import { Outlet, Navigate, useNavigate, useLocation, type RouteObject } from 'react-router';
import { useAuth } from '@exzaestate/app-core';
import { AppShell, type SidebarNavGroup } from '@exzaestate/ui';
import {
  LayoutDashboard,
  Users,
  Building2,
  Receipt,
  FileSpreadsheet,
  BarChart3,
  ShieldCheck,
  Briefcase,
  Settings,
  UserCheck,
  CheckSquare,
  ArrowRightLeft,
} from 'lucide-react';
import { authRoutes } from './auth/auth.routes.js';
import { StepUpModal } from './auth/components/StepUpModal.js';
import { SessionExpiredModal } from './auth/components/SessionExpiredModal.js';
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
import { setupRoutes } from './setup/setup.routes.js';
import { migrationRoutes } from './migration/migration.routes.js';
import { GlobalSearchCommandPalette } from './search/components/GlobalSearchCommandPalette.js';
import { NotificationDrawer } from './notifications/components/NotificationDrawer.js';

export function RootLayout() {
  return (
    <>
      <Outlet />
      <StepUpModal />
      <SessionExpiredModal />
    </>
  );
}

const ROUTE_PREFIX_MAP: Array<[string, string]> = [
  ['/properties', 'properties'],
  ['/crm', 'leads'],
  ['/sales', 'bookings'],
  ['/collection', 'collections'],
  ['/accounting', 'journals'],
  ['/operations', 'operations'],
  ['/reports', 'reports'],
  ['/audit', 'audit'],
  ['/settings', 'settings'],
  ['/users', 'users'],
  ['/roles', 'users'],
  ['/setup', 'setup'],
  ['/migration', 'migration'],
];

function resolveCurrentRouteId(path: string): string {
  const match = ROUTE_PREFIX_MAP.find(([prefix]) => path.startsWith(prefix));
  return match ? match[1] : 'dashboard';
}

export function ProtectedLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

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

  const currentRouteId = resolveCurrentRouteId(location.pathname);

  const sidebarGroups: SidebarNavGroup[] = [
    {
      id: 'overview',
      title: 'Overview',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/dashboard'),
        },
      ],
    },
    {
      id: 'crm',
      title: 'CRM & Sales',
      items: [
        {
          id: 'leads',
          label: 'Leads & Customers',
          icon: <Users className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/crm/leads'),
        },
        {
          id: 'bookings',
          label: 'Bookings & Sales',
          icon: <Receipt className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/sales/bookings'),
        },
      ],
    },
    {
      id: 'property',
      title: 'Property',
      items: [
        {
          id: 'properties',
          label: 'Inventory & Plots',
          icon: <Building2 className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/properties'),
        },
      ],
    },
    {
      id: 'finance',
      title: 'Finance & Accounts',
      items: [
        {
          id: 'collections',
          label: 'Collections',
          icon: <Receipt className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/collection/receipts'),
        },
        {
          id: 'journals',
          label: 'Chart of Accounts',
          icon: <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/accounting/coa'),
        },
      ],
    },
    {
      id: 'procurement',
      title: 'Operations',
      items: [
        {
          id: 'operations',
          label: 'Expenses & AP',
          icon: <Briefcase className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/operations/expenses'),
        },
      ],
    },
    {
      id: 'reports',
      title: 'Reports',
      items: [
        {
          id: 'reports',
          label: 'Reports Hub',
          icon: <BarChart3 className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/reports'),
        },
      ],
    },
    {
      id: 'system',
      title: 'System & Admin',
      items: [
        {
          id: 'users',
          label: 'Users & Roles',
          icon: <UserCheck className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/users'),
        },
        {
          id: 'settings',
          label: 'Settings & Numbering',
          icon: <Settings className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/settings'),
        },
        {
          id: 'setup',
          label: 'Setup Checklist',
          icon: <CheckSquare className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/setup/checklist'),
        },
        {
          id: 'migration',
          label: 'Migration Wizard',
          icon: <ArrowRightLeft className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/migration/wizard'),
        },
        {
          id: 'audit',
          label: 'Audit & Security',
          icon: <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/audit'),
        },
      ],
    },
  ];

  return (
    <>
      <AppShell
        companyName="ExzaEstate ERP"
        currentRouteId={currentRouteId}
        sidebarGroups={sidebarGroups}
        headerProps={{
          userEmail: user?.email,
          onOpenCommandPalette: () => setIsSearchOpen(true),
          onNotificationsClick: () => setIsNotifOpen(true),
        }}
      >
        <Outlet />
      </AppShell>

      {/* Global Universal Search Command Palette (Cmd+K) */}
      <GlobalSearchCommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Real-time SSE Notification Drawer */}
      <NotificationDrawer isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  );
}

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      ...authRoutes,
      {
        element: <ProtectedLayout />,
        children: [
          {
            path: '/',
            element: <Navigate to="/dashboard" replace />,
          },
          ...dashboardRoutes,
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
          ...settingsRoutes,
          ...usersRoutes,
          ...setupRoutes,
          ...migrationRoutes,
        ],
      },
    ],
  },
];
