import type { SidebarNavGroup } from '@exzaestate/ui';
import {
  LayoutDashboard,
  Users,
  Contact,
  Building2,
  FileText,
  Receipt,
  CreditCard,
  FileSpreadsheet,
  CheckCheck,
  Briefcase,
  BarChart3,
  UserCheck,
  Settings,
  CheckSquare,
  ArrowRightLeft,
  ShieldCheck,
  Clock,
  User,
} from 'lucide-react';

export const ROUTE_PREFIX_MAP: Array<[string, string]> = [
  ['/properties', 'properties'],
  ['/customers', 'customers'],
  ['/crm', 'leads'],
  ['/sales/quotations', 'quotations'],
  ['/sales/bookings', 'bookings'],
  ['/sales', 'bookings'],
  ['/approvals', 'approvals'],
  ['/collection/aging', 'aging'],
  ['/collection', 'collections'],
  ['/accounting', 'journals'],
  ['/operations', 'operations'],
  ['/reports', 'reports'],
  ['/audit', 'audit'],
  ['/profile', 'profile'],
  ['/settings', 'settings'],
  ['/users', 'users'],
  ['/roles', 'users'],
  ['/setup', 'setup'],
  ['/migration', 'migration'],
  ['/system', 'system-dashboard'],
];

export function resolveCurrentRouteId(path: string): string {
  const match = ROUTE_PREFIX_MAP.find(([prefix]) => path.startsWith(prefix));
  return match ? match[1] : 'dashboard';
}

export function createSystemAdminSidebarNavGroups(
  navigate: (path: string) => void,
): SidebarNavGroup[] {
  return [
    {
      id: 'platform-overview',
      title: 'Platform Control',
      items: [
        {
          id: 'system-dashboard',
          label: 'Platform Cockpit',
          icon: <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/system/dashboard'),
        },
        {
          id: 'audit',
          label: 'Platform Audit Trail',
          icon: <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/audit'),
        },
      ],
    },
    {
      id: 'tenants',
      title: 'Tenants & Licensing',
      items: [
        {
          id: 'system-tenants',
          label: 'Tenants Directory',
          icon: <Building2 className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/system/dashboard'),
        },
      ],
    },
    {
      id: 'infrastructure',
      title: 'Infrastructure & Health',
      items: [
        {
          id: 'system-health',
          label: 'Telemetry & Clusters',
          icon: <BarChart3 className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/system/dashboard'),
        },
      ],
    },
    {
      id: 'account',
      title: 'My Profile & Account',
      items: [
        {
          id: 'profile',
          label: 'My Profile & Account',
          icon: <User className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/profile'),
        },
      ],
    },
  ];
}

export function createSidebarNavGroups(navigate: (path: string) => void): SidebarNavGroup[] {
  return [
    {
      id: 'overview',
      title: 'Executive Cockpit',
      items: [
        {
          id: 'dashboard',
          label: 'Executive Cockpit',
          icon: <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/dashboard'),
        },
        {
          id: 'reports',
          label: 'Reports & Analytics',
          icon: <BarChart3 className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/reports'),
        },
      ],
    },
    {
      id: 'property',
      title: 'Property Assets',
      items: [
        {
          id: 'properties',
          label: 'Inventory & Units',
          icon: <Building2 className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/properties'),
        },
      ],
    },
    {
      id: 'crm',
      title: 'Sales Pipeline',
      items: [
        {
          id: 'leads',
          label: 'Leads & Inquiries',
          icon: <Users className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/crm/leads'),
        },
        {
          id: 'customers',
          label: 'Customers Directory',
          icon: <Contact className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/customers'),
        },
        {
          id: 'quotations',
          label: 'Price Quotations',
          icon: <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/sales/quotations'),
        },
        {
          id: 'bookings',
          label: 'Bookings & Sales',
          icon: <Receipt className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/sales/bookings'),
        },
        {
          id: 'approvals',
          label: 'Approvals Matrix',
          icon: <CheckCheck className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/approvals'),
        },
      ],
    },
    {
      id: 'finance',
      title: 'Finance & Treasury',
      items: [
        {
          id: 'collections',
          label: 'Payments & Receipts',
          icon: <CreditCard className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/collection/receipts'),
        },
        {
          id: 'aging',
          label: 'AR Aging Analysis',
          icon: <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/collection/aging'),
        },
        {
          id: 'journals',
          label: 'Chart of Accounts',
          icon: <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/accounting/coa'),
        },
        {
          id: 'operations',
          label: 'Expenses & AP',
          icon: <Briefcase className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/operations/expenses'),
        },
      ],
    },
    {
      id: 'system',
      title: 'Workspace & Admin',
      items: [
        {
          id: 'users',
          label: 'Users & Roles',
          icon: <UserCheck className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/users'),
        },
        {
          id: 'settings',
          label: 'Settings & Series',
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
          label: 'Security & Audit',
          icon: <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/audit'),
        },
        {
          id: 'profile',
          label: 'My Profile & Account',
          icon: <User className="w-4 h-4 shrink-0" aria-hidden="true" />,
          onClick: () => navigate('/profile'),
        },
      ],
    },
  ];
}
