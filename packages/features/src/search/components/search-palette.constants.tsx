import React from 'react';
import {
  Users,
  Building2,
  Receipt,
  FileSpreadsheet,
  FileText,
  Briefcase,
  FolderKanban,
  CheckCircle,
  LayoutDashboard,
  ShieldCheck,
} from 'lucide-react';

export interface NavCommand {
  id: string;
  title: string;
  category: string;
  path: string;
  icon: React.ReactNode;
}

export const DEFAULT_COMMANDS: NavCommand[] = [
  {
    id: 'cmd-dash',
    title: 'Go to Executive Dashboard',
    category: 'Navigation',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-4 h-4 text-primary" />,
  },
  {
    id: 'cmd-prop',
    title: 'Browse Property Inventory',
    category: 'Navigation',
    path: '/properties',
    icon: <Building2 className="w-4 h-4 text-special" />,
  },
  {
    id: 'cmd-book',
    title: 'View All Bookings',
    category: 'Navigation',
    path: '/sales/bookings',
    icon: <Receipt className="w-4 h-4 text-accent-text" />,
  },
  {
    id: 'cmd-col',
    title: 'Collection & Receipts',
    category: 'Navigation',
    path: '/collection/receipts',
    icon: <CheckCircle className="w-4 h-4 text-success" />,
  },
  {
    id: 'cmd-rep',
    title: 'Reports Hub & Financials',
    category: 'Navigation',
    path: '/reports',
    icon: <FileSpreadsheet className="w-4 h-4 text-info" />,
  },
  {
    id: 'cmd-aud',
    title: 'Security & Audit Log Viewer',
    category: 'Navigation',
    path: '/audit',
    icon: <ShieldCheck className="w-4 h-4 text-void" />,
  },
];

export function getEntityIcon(type: string): React.ReactNode {
  switch (type.toUpperCase()) {
    case 'CUSTOMER':
      return <Users className="w-4 h-4 text-primary" />;
    case 'LEAD':
      return <Users className="w-4 h-4 text-accent-text" />;
    case 'BOOKING':
      return <Receipt className="w-4 h-4 text-info" />;
    case 'PROPERTY':
      return <Building2 className="w-4 h-4 text-special" />;
    case 'PAYMENT':
    case 'RECEIPT':
      return <CheckCircle className="w-4 h-4 text-success" />;
    case 'VENDOR':
      return <Briefcase className="w-4 h-4 text-void" />;
    case 'PROJECT':
      return <FolderKanban className="w-4 h-4 text-primary" />;
    default:
      return <FileText className="w-4 h-4 text-text-muted" />;
  }
}

const ENTITY_PATH_MAP: Record<string, string> = {
  CUSTOMER: '/crm/customers',
  LEAD: '/crm/leads',
  BOOKING: '/sales/bookings',
  PROPERTY: '/properties',
  PAYMENT: '/collection/receipts',
  RECEIPT: '/collection/receipts',
  VOUCHER: '/operations/expenses',
  DOCUMENT: '/operations/documents',
  VENDOR: '/operations/vendors',
  PROJECT: '/properties',
};

export function resolveEntityPath(type: string): string {
  return ENTITY_PATH_MAP[type.toUpperCase()] ?? '/dashboard';
}
