import { Building2, KeyRound, ShieldCheck } from 'lucide-react';
import type {
  TenantItem,
  PlatformLicenseItem,
  PlatformAuditLogItem,
} from '../schemas/system-admin.schema.js';
import { TenantDirectoryTable } from '../components/TenantDirectoryTable.js';
import { PlatformLicensesTable } from '../components/PlatformLicensesTable.js';
import { PlatformAuditLogsTable } from '../components/PlatformAuditLogsTable.js';

export type DashboardTab = 'tenants' | 'licenses' | 'audit';

interface PlatformDashboardTabsProps {
  activeTab: DashboardTab;
  onChangeTab: (tab: DashboardTab) => void;
  tenants: TenantItem[];
  licenses: PlatformLicenseItem[];
  auditLogs: PlatformAuditLogItem[];
  isLoadingLicenses: boolean;
  isLoadingAuditLogs: boolean;
  onViewTenant: (tenant: TenantItem) => void;
  onOpenLicenseGenerator: (tenant: TenantItem) => void;
  onToggleSuspend: (tenant: TenantItem) => void;
  onOpenIssueLicense: () => void;
  isMutatingStatus: boolean;
}

export function PlatformDashboardTabs({
  activeTab,
  onChangeTab,
  tenants,
  licenses,
  auditLogs,
  isLoadingLicenses,
  isLoadingAuditLogs,
  onViewTenant,
  onOpenLicenseGenerator,
  onToggleSuspend,
  onOpenIssueLicense,
  isMutatingStatus,
}: PlatformDashboardTabsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 p-1 rounded-card bg-surface-sunken/60 border border-border w-fit text-small font-medium">
        <button
          type="button"
          onClick={() => onChangeTab('tenants')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-button transition cursor-pointer ${
            activeTab === 'tenants'
              ? 'bg-action text-on-action shadow-xs font-semibold'
              : 'text-text-muted hover:text-text hover:bg-surface'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Company Directory</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-caption font-mono ${
              activeTab === 'tenants'
                ? 'bg-on-action/20 text-on-action'
                : 'bg-surface text-text-muted'
            }`}
          >
            {tenants.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('licenses')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-button transition cursor-pointer ${
            activeTab === 'licenses'
              ? 'bg-action text-on-action shadow-xs font-semibold'
              : 'text-text-muted hover:text-text hover:bg-surface'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Software Licenses</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-caption font-mono ${
              activeTab === 'licenses'
                ? 'bg-on-action/20 text-on-action'
                : 'bg-surface text-text-muted'
            }`}
          >
            {licenses.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('audit')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-button transition cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-action text-on-action shadow-xs font-semibold'
              : 'text-text-muted hover:text-text hover:bg-surface'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Activity & Audit Log</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-caption font-mono ${
              activeTab === 'audit'
                ? 'bg-on-action/20 text-on-action'
                : 'bg-surface text-text-muted'
            }`}
          >
            {auditLogs.length}
          </span>
        </button>
      </div>

      {activeTab === 'tenants' && (
        <TenantDirectoryTable
          tenants={tenants}
          onViewDetails={onViewTenant}
          onOpenLicenseGenerator={onOpenLicenseGenerator}
          onToggleSuspend={onToggleSuspend}
          isMutating={isMutatingStatus}
        />
      )}

      {activeTab === 'licenses' && (
        <PlatformLicensesTable
          licenses={licenses}
          isLoading={isLoadingLicenses}
          onOpenIssueModal={onOpenIssueLicense}
        />
      )}

      {activeTab === 'audit' && (
        <PlatformAuditLogsTable logs={auditLogs} isLoading={isLoadingAuditLogs} />
      )}
    </div>
  );
}
