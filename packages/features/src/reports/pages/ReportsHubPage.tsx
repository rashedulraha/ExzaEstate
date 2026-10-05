import { useNavigate } from 'react-router';
import {
  FileSpreadsheet,
  TrendingUp,
  Receipt,
  Building2,
  ShieldCheck,
  ArrowRight,
  DollarSign,
  FolderKanban,
} from 'lucide-react';

interface ReportCardItem {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  tag: string;
}

export function ReportsHubPage() {
  const navigate = useNavigate();

  const financialReports: ReportCardItem[] = [
    {
      id: 'trial-balance',
      title: 'Trial Balance',
      description: 'Double-entry debit and credit verification across all ledger accounts',
      path: '/reports/trial-balance',
      icon: <FileSpreadsheet className="w-5 h-5 text-primary-fg" />,
      tag: 'Statutory (P0)',
    },
    {
      id: 'balance-sheet',
      title: 'Balance Sheet',
      description: 'Statement of financial position: Assets = Liabilities + Equity',
      path: '/reports/balance-sheet',
      icon: <ShieldCheck className="w-5 h-5 text-info" />,
      tag: 'Statutory (P0)',
    },
    {
      id: 'income-statement',
      title: 'Income Statement (P&L)',
      description: 'Revenue, direct development expenses, operating costs, and net income',
      path: '/reports/income-statement',
      icon: <TrendingUp className="w-5 h-5 text-success" />,
      tag: 'Statutory (P0)',
    },
  ];

  const salesReports: ReportCardItem[] = [
    {
      id: 'sales-report',
      title: 'Sales & Booking Register',
      description: 'Confirmed sales, customer allotments, net sales value, and executive targets',
      path: '/reports/sales',
      icon: <Receipt className="w-5 h-5 text-accent-text" />,
      tag: 'Sales & CRM',
    },
    {
      id: 'collection-report',
      title: 'Collection & Realization',
      description:
        'Cleared customer money receipts, installment realizations, and cheque clearances',
      path: '/reports/collection',
      icon: <DollarSign className="w-5 h-5 text-success" />,
      tag: 'Collection',
    },
  ];

  const operationalReports: ReportCardItem[] = [
    {
      id: 'inventory-report',
      title: 'Property Inventory Status',
      description: 'Live availability, holds, reservations, bookings, and sold unit values',
      path: '/reports/inventory',
      icon: <Building2 className="w-5 h-5 text-special" />,
      tag: 'Inventory',
    },
    {
      id: 'profitability-report',
      title: 'Project Profitability',
      description: 'Project cost center revenue, construction expenses, and margin realization',
      path: '/operations/profitability',
      icon: <FolderKanban className="w-5 h-5 text-primary-fg" />,
      tag: 'Cost Centers',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="border-b border-border pb-4">
        <h1 className="text-heading-2 text-text font-semibold">Reports & Statutory Accounts</h1>
        <p className="text-caption text-text-muted mt-0.5">
          Backend-generated audit-ready financial statements, sales registries, and operational
          reports (MOD-REPORTS)
        </p>
      </div>

      {/* Section 1: Financial Statements */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <h2 className="text-body font-semibold text-text">Financial Statements & Ledger</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {financialReports.map((r) => (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(r.path)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(r.path);
                }
              }}
              className="card-workspace p-5 hover:border-border-strong transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded bg-surface-sunken">{r.icon}</div>
                  <span className="text-caption px-2 py-0.5 rounded-full bg-surface-sunken text-text-muted font-medium">
                    {r.tag}
                  </span>
                </div>
                <h3 className="text-body font-semibold text-text group-hover:text-primary transition-colors">
                  {r.title}
                </h3>
                <p className="text-small text-text-muted mt-1 leading-relaxed">{r.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-caption font-semibold text-primary">
                <span>View Report</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Sales & Collection */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <h2 className="text-body font-semibold text-text">Sales, Bookings & Collections</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {salesReports.map((r) => (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(r.path)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(r.path);
                }
              }}
              className="card-workspace p-5 hover:border-border-strong transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded bg-surface-sunken">{r.icon}</div>
                  <span className="text-caption px-2 py-0.5 rounded-full bg-surface-sunken text-text-muted font-medium">
                    {r.tag}
                  </span>
                </div>
                <h3 className="text-body font-semibold text-text group-hover:text-primary transition-colors">
                  {r.title}
                </h3>
                <p className="text-small text-text-muted mt-1 leading-relaxed">{r.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-caption font-semibold text-primary">
                <span>View Report</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Operations & Inventory */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-special" />
          <h2 className="text-body font-semibold text-text">
            Operations, Inventory & Cost Centers
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {operationalReports.map((r) => (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(r.path)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(r.path);
                }
              }}
              className="card-workspace p-5 hover:border-border-strong transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded bg-surface-sunken">{r.icon}</div>
                  <span className="text-caption px-2 py-0.5 rounded-full bg-surface-sunken text-text-muted font-medium">
                    {r.tag}
                  </span>
                </div>
                <h3 className="text-body font-semibold text-text group-hover:text-primary transition-colors">
                  {r.title}
                </h3>
                <p className="text-small text-text-muted mt-1 leading-relaxed">{r.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-caption font-semibold text-primary">
                <span>View Report</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
