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
      <div className="flex items-center gap-2 border-b border-border pb-2 text-small font-medium">
        <button
          type="button"
          onClick={() => onChangeTab('tenants')}
          className={`px-3 py-1.5 rounded-button transition cursor-pointer ${
            activeTab === 'tenants'
              ? 'bg-action text-on-action shadow-xs'
              : 'text-text-muted hover:text-text hover:bg-surface-sunken'
          }`}
        >
          Tenants Directory ({tenants.length})
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('licenses')}
          className={`px-3 py-1.5 rounded-button transition cursor-pointer ${
            activeTab === 'licenses'
              ? 'bg-action text-on-action shadow-xs'
              : 'text-text-muted hover:text-text hover:bg-surface-sunken'
          }`}
        >
          Cryptographic Licenses ({licenses.length})
        </button>

        <button
          type="button"
          onClick={() => onChangeTab('audit')}
          className={`px-3 py-1.5 rounded-button transition cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-action text-on-action shadow-xs'
              : 'text-text-muted hover:text-text hover:bg-surface-sunken'
          }`}
        >
          Platform Audit Trail ({auditLogs.length})
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
