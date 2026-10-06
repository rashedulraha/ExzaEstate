import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Receipt,
  FileSpreadsheet,
  BarChart3,
  Settings,
  ShieldCheck,
  UserCheck,
  CreditCard,
  Briefcase,
  KeyRound,
  FileText,
} from 'lucide-react';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
  badge?: string | number;
  onClick?: () => void;
}

export interface SidebarNavGroup {
  id: string;
  title: string;
  items: SidebarNavItem[];
}

export const defaultSidebarGroups: SidebarNavGroup[] = [
  {
    id: 'overview',
    title: 'Overview',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
    ],
  },
  {
    id: 'crm',
    title: 'CRM & Sales',
    items: [
      {
        id: 'leads',
        label: 'Leads & Pipeline',
        icon: <Users className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
      {
        id: 'customers',
        label: 'Customers KYC',
        icon: <UserCheck className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
      {
        id: 'bookings',
        label: 'Bookings & Sales',
        icon: <Receipt className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
      {
        id: 'quotations',
        label: 'Quotations & Pricing',
        icon: <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
      {
        id: 'approvals',
        label: 'Approvals Matrix',
        icon: <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />,
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
      },
    ],
  },
  {
    id: 'finance',
    title: 'Finance & Treasury',
    items: [
      {
        id: 'collections',
        label: 'Money Receipts',
        icon: <Receipt className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
      {
        id: 'cheques',
        label: 'Cheques Register',
        icon: <CreditCard className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
      {
        id: 'journals',
        label: 'Chart of Accounts',
        icon: <FileSpreadsheet className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operations & AP',
    items: [
      {
        id: 'operations',
        label: 'Expenses & Bills',
        icon: <Briefcase className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
    ],
  },
  {
    id: 'reports',
    title: 'Reports & Audit',
    items: [
      {
        id: 'reports',
        label: 'Reports Hub',
        icon: <BarChart3 className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
      {
        id: 'audit',
        label: 'Security & Audit Logs',
        icon: <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />,
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
        icon: <Users className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
      {
        id: 'settings',
        label: 'Company Settings',
        icon: <Settings className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
      {
        id: 'license',
        label: 'Licensing & Activation',
        icon: <KeyRound className="w-4 h-4 shrink-0" aria-hidden="true" />,
      },
    ],
  },
];
