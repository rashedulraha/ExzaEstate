import { useState, useMemo } from 'react';
import { Search, Copy, Check, Plus, ShieldCheck } from 'lucide-react';
import { Button } from '@exzaestate/ui';
import type { PlatformLicenseItem } from '../schemas/system-admin.schema.js';

interface PlatformLicensesTableProps {
  licenses: PlatformLicenseItem[];
  onOpenIssueModal: () => void;
  isLoading?: boolean;
}

export function PlatformLicensesTable({
  licenses,
  onOpenIssueModal,
  isLoading,
}: PlatformLicensesTableProps) {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return licenses;
    return licenses.filter(
      (l) =>
        l.licenseKey.toLowerCase().includes(q) ||
        l.companyName.toLowerCase().includes(q) ||
        l.companyCode.toLowerCase().includes(q) ||
        l.plan.toLowerCase().includes(q) ||
        (l.machineId && l.machineId.toLowerCase().includes(q)),
    );
  }, [licenses, search]);

  const handleCopyKey = (id: string, key: string) => {
    void navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rounded-card border border-border bg-surface shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search licenses by key, company, plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-button border border-border-input bg-surface pl-9 pr-4 py-1.5 text-body text-text placeholder:text-text-disabled transition focus:border-focus focus:outline-none focus:ring-1 focus:ring-focus"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-caption text-text-muted tabular-nums">
            Total Issued: {licenses.length}
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenIssueModal}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Issue License
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-sunken/40 text-caption font-semibold text-text-muted">
              <th className="py-3 px-4">License Key</th>
              <th className="py-3 px-4">Company</th>
              <th className="py-3 px-4">Subscription Plan</th>
              <th className="py-3 px-4">Device / Machine ID</th>
              <th className="py-3 px-4">Capacity Limits</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Valid Until</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-body">
            <LicensesTableBody
              isLoading={isLoading}
              licensesCount={licenses.length}
              filtered={filtered}
              copiedId={copiedId}
              onCopyKey={handleCopyKey}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface LicensesTableBodyProps {
  isLoading?: boolean;
  licensesCount: number;
  filtered: PlatformLicenseItem[];
  copiedId: string | null;
  onCopyKey: (id: string, key: string) => void;
}

function LicensesTableBody({
  isLoading,
  licensesCount,
  filtered,
  copiedId,
  onCopyKey,
}: LicensesTableBodyProps) {
  if (isLoading && licensesCount === 0) {
    return (
      <tr>
        <td colSpan={7} className="py-10 text-center text-text-muted">
          <div className="h-4 w-32 mx-auto animate-skeleton-breathe rounded bg-surface-sunken" />
        </td>
      </tr>
    );
  }

  if (filtered.length === 0) {
    return (
      <tr>
        <td colSpan={7} className="py-12 text-center text-text-muted">
          <div className="flex flex-col items-center justify-center gap-2">
            <ShieldCheck className="w-8 h-8 text-text-disabled" />
            <p className="text-body font-medium text-text">No software licenses found</p>
            <p className="text-caption text-text-muted">
              Create a new software license for any registered client company.
            </p>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      {filtered.map((lic) => {
        const isActive = lic.status === 'ACTIVE';
        const expiryDate = new Date(lic.validUntil).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        const isCopied = copiedId === lic.id;

        return (
          <tr key={lic.id} className="hover:bg-surface-sunken/20 transition-colors">
            {/* Key */}
            <td className="py-3.5 px-4 font-medium text-text">
              <div className="flex items-center gap-2">
                <span className="font-mono text-small text-text font-semibold">
                  {lic.licenseKey}
                </span>
                <button
                  type="button"
                  onClick={() => onCopyKey(lic.id, lic.licenseKey)}
                  className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-sunken cursor-pointer transition"
                  title="Copy license key"
                  aria-label="Copy license key"
                >
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <div className="text-[10px] font-mono text-text-muted truncate max-w-xs mt-0.5">
                Signature: Verified &amp; Active
              </div>
            </td>

            {/* Company */}
            <td className="py-3.5 px-4">
              <div className="font-semibold text-text text-small">{lic.companyName}</div>
              <div className="text-caption text-text-muted font-mono">{lic.companyCode}</div>
            </td>

            {/* Plan */}
            <td className="py-3.5 px-4">
              <span className="px-2 py-0.5 rounded-button text-caption font-semibold bg-primary/10 text-primary border border-primary/20">
                {lic.plan}
              </span>
            </td>

            {/* Machine ID */}
            <td className="py-3.5 px-4 font-mono text-caption text-text-muted">
              {lic.machineId ? (
                <span className="truncate max-w-[140px] inline-block" title={lic.machineId}>
                  {lic.machineId}
                </span>
              ) : (
                <span className="text-text-muted/60">All Devices (Cloud)</span>
              )}
            </td>

            {/* Capacity Limits */}
            <td className="py-3.5 px-4 text-small tabular-nums text-text">
              <div>{lic.maxSeats} Seats</div>
              <div className="text-caption text-text-muted">
                {lic.maxBranches} Branch · {lic.maxProjects} Projects
              </div>
            </td>

            {/* Status */}
            <td className="py-3.5 px-4">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium border ${
                  isActive
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-danger/10 text-danger border-danger/20'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-success' : 'bg-danger'}`}
                />
                {lic.status}
              </span>
            </td>

            {/* Valid Until */}
            <td className="py-3.5 px-4 text-right font-medium text-small tabular-nums text-text">
              {expiryDate}
            </td>
          </tr>
        );
      })}
    </>
  );
}
