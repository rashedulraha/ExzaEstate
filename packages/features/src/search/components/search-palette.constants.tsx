import type { ReactNode } from 'react';
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
  UserCheck,
  CreditCard,
  Clock,
  Landmark,
  Settings,
  Shield,
  PlusCircle,
} from 'lucide-react';

export interface NavCommand {
  id: string;
  title: string;
  category: string;
  path: string;
  keywords: string[];
  icon: ReactNode;
}

export const ALL_NAV_COMMANDS: NavCommand[] = [
  // ── Quick Transactions (New Record Launchers) ──────────────────────────────
  {
    id: 'tx-receipt',
    title: '+ Issue Money Receipt (Installment / Booking Payment)',
    category: 'Quick Transactions',
    path: '/collection/receipts',
    keywords: ['new', 'create', 'payment', 'receipt', 'money', 'cheque', 'collection'],
    icon: <PlusCircle className="w-4 h-4 text-emerald-400" />,
  },
  {
    id: 'tx-booking',
    title: '+ New Booking & Agreement (Plot / Flat Sale)',
    category: 'Quick Transactions',
    path: '/sales/bookings',
    keywords: ['new', 'booking', 'sale', 'agreement', 'allotment', 'buyer'],
    icon: <PlusCircle className="w-4 h-4 text-accent" />,
  },
  {
    id: 'tx-lead',
    title: '+ Register New Lead & Prospect (Inquiry)',
    category: 'Quick Transactions',
    path: '/crm/leads',
    keywords: ['new', 'lead', 'prospect', 'inquiry', 'customer', 'phone'],
    icon: <PlusCircle className="w-4 h-4 text-info" />,
  },
  {
    id: 'tx-cust',
    title: '+ Add New Customer Profile',
    category: 'Quick Transactions',
    path: '/customers',
    keywords: ['new', 'customer', 'kyc', 'nid', 'client', 'profile'],
    icon: <PlusCircle className="w-4 h-4 text-primary" />,
  },
  {
    id: 'tx-exp',
    title: '+ Record Office / Project Expense',
    category: 'Quick Transactions',
    path: '/operations/expenses',
    keywords: ['new', 'expense', 'voucher', 'bill', 'vendor', 'payment', 'cost'],
    icon: <PlusCircle className="w-4 h-4 text-warning" />,
  },
  {
    id: 'tx-prop',
    title: '+ Add Property Unit (Plot / Flat)',
    category: 'Quick Transactions',
    path: '/properties',
    keywords: ['new', 'plot', 'unit', 'property', 'flat', 'inventory'],
    icon: <PlusCircle className="w-4 h-4 text-special" />,
  },

  // ── Overview & Navigation ──────────────────────────────────────────────────
  {
    id: 'cmd-dash',
    title: 'Go to Overview Dashboard',
    category: 'Overview',
    path: '/dashboard',
    keywords: ['home', 'overview', 'kpi', 'metrics', 'analytics', 'performance'],
    icon: <LayoutDashboard className="w-4 h-4 text-primary" />,
  },
  {
    id: 'cmd-rep',
    title: 'Reports & Financial Statements',
    category: 'Overview',
    path: '/reports',
    keywords: ['reports', 'trial balance', 'balance sheet', 'income statement', 'audit'],
    icon: <FileSpreadsheet className="w-4 h-4 text-info" />,
  },

  // ── CRM & Sales ────────────────────────────────────────────────────────────
  {
    id: 'cmd-lead',
    title: 'Sales Leads & Inquiries',
    category: 'CRM & Sales',
    path: '/crm/leads',
    keywords: ['leads', 'prospects', 'crm', 'pipeline', 'inquiries'],
    icon: <Users className="w-4 h-4 text-accent-text" />,
  },
  {
    id: 'cmd-cust',
    title: 'Customer Directory',
    category: 'CRM & Sales',
    path: '/customers',
    keywords: ['customer', 'clients', 'kyc', 'nid', 'nominee', 'buyers'],
    icon: <UserCheck className="w-4 h-4 text-primary" />,
  },
  {
    id: 'cmd-book',
    title: 'View All Bookings & Sales',
    category: 'CRM & Sales',
    path: '/sales/bookings',
    keywords: ['bookings', 'agreements', 'allotment', 'sales', 'contracts'],
    icon: <Receipt className="w-4 h-4 text-accent-text" />,
  },
  {
    id: 'cmd-quote',
    title: 'Quotations & Pricing Plans',
    category: 'CRM & Sales',
    path: '/sales/quotations',
    keywords: ['quotation', 'pricing', 'installment plan', 'estimate', 'cost'],
    icon: <FileText className="w-4 h-4 text-special" />,
  },
  {
    id: 'cmd-appr',
    title: 'Pending Approvals',
    category: 'CRM & Sales',
    path: '/approvals',
    keywords: ['approvals', 'discounts', 'exceptions', 'requests'],
    icon: <ShieldCheck className="w-4 h-4 text-warning" />,
  },

  // ── Properties & Inventory ─────────────────────────────────────────────────
  {
    id: 'cmd-prop',
    title: 'Browse Property Inventory',
    category: 'Property',
    path: '/properties',
    keywords: ['plots', 'flats', 'units', 'inventory', 'master plan', 'stock'],
    icon: <Building2 className="w-4 h-4 text-special" />,
  },

  // ── Finance & Treasury ─────────────────────────────────────────────────────
  {
    id: 'cmd-col',
    title: 'Payments & Money Receipts',
    category: 'Finance',
    path: '/collection/receipts',
    keywords: ['collections', 'money receipts', 'payments', 'cash', 'mr'],
    icon: <Receipt className="w-4 h-4 text-emerald-400" />,
  },
  {
    id: 'cmd-chq',
    title: 'Cheque Clearing & Records',
    category: 'Finance',
    path: '/collection/cheques',
    keywords: ['cheques', 'clearing', 'bounced', 'deposit', 'bank'],
    icon: <CreditCard className="w-4 h-4 text-info" />,
  },
  {
    id: 'cmd-aging',
    title: 'Due & Overdue Collections',
    category: 'Finance',
    path: '/collection/aging',
    keywords: ['aging', 'overdue', 'installments', 'debtors', 'receivables'],
    icon: <Clock className="w-4 h-4 text-danger" />,
  },
  {
    id: 'cmd-coa',
    title: 'Chart of Accounts',
    category: 'Finance',
    path: '/accounting/coa',
    keywords: ['coa', 'accounts', 'ledger', 'general ledger', 'accounting'],
    icon: <Landmark className="w-4 h-4 text-primary" />,
  },

  // ── Operations & System ────────────────────────────────────────────────────
  {
    id: 'cmd-exp',
    title: 'Office & Project Expenses',
    category: 'Operations',
    path: '/operations/expenses',
    keywords: ['expenses', 'bills', 'procurement', 'operating cost'],
    icon: <Briefcase className="w-4 h-4 text-warning" />,
  },
  {
    id: 'cmd-user',
    title: 'Users & Team Roles',
    category: 'System',
    path: '/users',
    keywords: ['users', 'roles', 'permissions', 'staff', 'access'],
    icon: <Shield className="w-4 h-4 text-primary" />,
  },
  {
    id: 'cmd-sett',
    title: 'Company Settings',
    category: 'System',
    path: '/settings',
    keywords: ['settings', 'numbering', 'prefix', 'fiscal year', 'policy'],
    icon: <Settings className="w-4 h-4 text-text-muted" />,
  },
  {
    id: 'cmd-aud',
    title: 'Activity & Audit Log',
    category: 'System',
    path: '/audit',
    keywords: ['audit', 'security events', 'logs', 'compliance', 'history'],
    icon: <ShieldCheck className="w-4 h-4 text-void" />,
  },
];

const DEFAULT_COMMAND_IDS = [
  'tx-receipt',
  'tx-booking',
  'tx-lead',
  'tx-cust',
  'tx-exp',
  'tx-prop',
  'cmd-dash',
  'cmd-prop',
  'cmd-book',
  'cmd-rep',
  'cmd-aud',
];

export const DEFAULT_COMMANDS: NavCommand[] = DEFAULT_COMMAND_IDS.map((id) =>
  ALL_NAV_COMMANDS.find((cmd) => cmd.id === id),
).filter((cmd): cmd is NavCommand => Boolean(cmd));

export function getEntityIcon(type: string): ReactNode {
  switch (type.toUpperCase()) {
    case 'CUSTOMER':
      return <UserCheck className="w-4 h-4 text-primary" />;
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

export function filterNavCommands(query: string): NavCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return ALL_NAV_COMMANDS;

  return ALL_NAV_COMMANDS.filter((cmd) => {
    if (cmd.title.toLowerCase().includes(q)) return true;
    if (cmd.category.toLowerCase().includes(q)) return true;
    return cmd.keywords.some((k) => k.toLowerCase().includes(q));
  });
}
