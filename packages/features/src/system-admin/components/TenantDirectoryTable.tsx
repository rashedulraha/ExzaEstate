import { useState, useMemo } from 'react';
import { Search, Building2, KeyRound, ShieldAlert, ShieldCheck, Eye } from 'lucide-react';
import { Button } from '@exzaestate/ui';
import type { TenantItem } from '../schemas/system-admin.schema.js';

interface TenantDirectoryTableProps {
  tenants: TenantItem[];
  onViewDetails: (tenant: TenantItem) => void;
  onOpenLicenseGenerator: (tenant: TenantItem) => void;
  onToggleSuspend: (tenant: TenantItem) => void;
  isMutating?: boolean;
}

const FILTER_OPTIONS: Array<{ key: 'ALL' | 'ACTIVE' | 'SUSPENDED'; label: string }> = [
  { key: 'ALL', label: 'All Companies' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'SUSPENDED', label: 'Suspended' },
];

export function TenantDirectoryTable({
  tenants,
  onViewDetails,
  onOpenLicenseGenerator,
  onToggleSuspend,
  isMutating,
}: TenantDirectoryTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.code.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tenants, search, statusFilter]);

  return (
    <div className="rounded-card border border-border bg-surface shadow-xs overflow-hidden">
      {/* Table Header & Search Filter Bar */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search companies by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-button border border-border-input bg-surface pl-9 pr-4 py-1.5 text-body text-text placeholder:text-text-disabled transition focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setStatusFilter(opt.key)}
              className={`px-3 py-1 text-caption font-medium rounded-button transition cursor-pointer ${
                statusFilter === opt.key
                  ? 'bg-action text-on-action'
                  : 'bg-surface-sunken text-text-muted hover:text-text hover:bg-surface-sunken/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-sunken/40 text-caption font-semibold text-text-muted">
              <th className="py-3 px-4">Company Name</th>
              <th className="py-3 px-4">Company Code</th>
              <th className="py-3 px-4">Location / Timezone</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4">Registration Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-body">
            {filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Building2 className="w-8 h-8 text-text-disabled" />
                    <p className="text-body font-medium text-text">No companies found</p>
                    <p className="text-caption text-text-muted">
                      Try adjusting your search or register a new client company.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredTenants.map((tenant) => {
                const isActive = tenant.status === 'ACTIVE';
                const createdDate = new Date(tenant.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <tr key={tenant.id} className="hover:bg-surface-sunken/20 transition-colors">
                    <td className="py-3 px-4 font-medium text-text">
                      <div className="font-semibold text-text text-small">{tenant.name}</div>
                      <div
                        className="text-caption text-text-muted font-mono truncate max-w-[220px]"
                        title={tenant.id}
                      >
                        {tenant.id}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-small text-text">
                      <span className="px-2 py-0.5 rounded-button bg-surface-sunken border border-border">
                        {tenant.code}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-text-muted text-small">
                      {tenant.timezone || 'Asia/Dhaka'}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium border ${
                          isActive
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-danger/10 text-danger border-danger/20'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive ? 'bg-success' : 'bg-danger'
                          }`}
                        />
                        {tenant.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-text-muted text-small tabular-nums">
                      {createdDate}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewDetails(tenant)}
                          className="p-1.5 rounded-button text-text-muted hover:text-text hover:bg-surface-sunken transition cursor-pointer"
                          title="View Details"
                          aria-label="View tenant details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onOpenLicenseGenerator(tenant)}
                          leftIcon={<KeyRound className="w-3.5 h-3.5" />}
                        >
                          License
                        </Button>

                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={() => onToggleSuspend(tenant)}
                          className={`p-1.5 rounded-button transition cursor-pointer disabled:opacity-50 ${
                            isActive
                              ? 'text-danger hover:bg-danger/10'
                              : 'text-success hover:bg-success/10'
                          }`}
                          title={isActive ? 'Suspend Company' : 'Reactivate Company'}
                          aria-label={isActive ? 'Suspend Company' : 'Reactivate Company'}
                        >
                          {isActive ? (
                            <ShieldAlert className="w-4 h-4" />
                          ) : (
                            <ShieldCheck className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
