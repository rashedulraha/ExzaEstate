import { useState } from 'react';
import { useToast, LoadingState, ErrorState } from '@exzaestate/ui';
import { useSystemAdmin } from '../hooks/useSystemAdmin.js';
import { ClusterTelemetryConsole } from '../components/ClusterTelemetryConsole.js';
import { PlatformFastNavCards } from '../components/PlatformFastNavCards.js';
import { OnboardTenantModal } from '../components/OnboardTenantModal.js';
import { LicenseGeneratorModal } from '../components/LicenseGeneratorModal.js';
import { TenantDetailModal } from '../components/TenantDetailModal.js';
import { PlatformDashboardHeader } from './PlatformDashboardHeader.js';
import { PlatformDashboardTabs, type DashboardTab } from './PlatformDashboardTabs.js';
import type {
  TenantItem,
  OnboardTenantFormData,
  GenerateLicenseFormData,
} from '../schemas/system-admin.schema.js';

export function PlatformSuperAdminDashboardPage() {
  const { showToast } = useToast();
  const {
    tenants,
    isLoadingTenants,
    isTenantsError,
    refetchTenants,
    health,
    isLoadingHealth,
    refetchHealth,
    licenses,
    isLoadingLicenses,
    refetchLicenses,
    auditLogs,
    isLoadingAuditLogs,
    refetchAuditLogs,
    onboardTenant,
    isOnboarding,
    suspendTenant,
    reactivateTenant,
    generateLicense,
    isGeneratingLicense,
  } = useSystemAdmin();

  // Tab & Modal states
  const [activeTab, setActiveTab] = useState<DashboardTab>('tenants');
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);
  const [selectedTenantForLicense, setSelectedTenantForLicense] = useState<TenantItem | null>(null);
  const [viewingTenant, setViewingTenant] = useState<TenantItem | null>(null);
  const [isMutatingStatus, setIsMutatingStatus] = useState(false);

  const handleRefreshAll = async () => {
    await Promise.all([refetchTenants(), refetchHealth(), refetchLicenses(), refetchAuditLogs()]);
    showToast({
      title: 'System Data Refreshed',
      description: 'Companies, licenses, and server status successfully updated.',
      family: 'info',
    });
  };

  const handleOnboardSubmit = async (data: OnboardTenantFormData) => {
    try {
      const res = await onboardTenant(data);
      showToast({
        title: 'Company Registered Successfully',
        description: `Company ${data.name} (${res.companyCode}) is now ready.`,
        family: 'success',
      });
      setIsOnboardOpen(false);
    } catch (err) {
      showToast({
        title: 'Registration Failed',
        description: err instanceof Error ? err.message : 'Unable to register company.',
        family: 'danger',
      });
    }
  };

  const handleLicenseGenerate = async (data: GenerateLicenseFormData) => {
    try {
      const res = await generateLicense(data);
      showToast({
        title: 'Software License Created',
        description: 'New software license issued and active.',
        family: 'success',
      });
      return res;
    } catch (err) {
      showToast({
        title: 'Generation Failed',
        description: err instanceof Error ? err.message : 'Could not generate license.',
        family: 'danger',
      });
      throw err;
    }
  };

  const handleToggleSuspend = async (tenant: TenantItem) => {
    if (tenant.status === 'ACTIVE') {
      setViewingTenant(tenant);
      return;
    }
    try {
      setIsMutatingStatus(true);
      await reactivateTenant(tenant.id);
      showToast({
        title: 'Company Reactivated',
        description: `${tenant.name} is now ACTIVE. Employee logins unblocked.`,
        family: 'success',
      });
    } catch (err) {
      showToast({
        title: 'Action Failed',
        description: err instanceof Error ? err.message : 'Unable to reactivate company.',
        family: 'danger',
      });
    } finally {
      setIsMutatingStatus(false);
    }
  };

  const handleConfirmSuspend = async (reason: string) => {
    if (!viewingTenant) return;
    try {
      setIsMutatingStatus(true);
      await suspendTenant({ id: viewingTenant.id, reason });
      showToast({
        title: 'Company Suspended',
        description: `${viewingTenant.name} has been suspended.`,
        family: 'warning',
      });
      setViewingTenant(null);
    } catch (err) {
      showToast({
        title: 'Suspension Failed',
        description: err instanceof Error ? err.message : 'Could not suspend company.',
        family: 'danger',
      });
    } finally {
      setIsMutatingStatus(false);
    }
  };

  const handleReactivateViewingTenant = async () => {
    if (!viewingTenant) return;
    await reactivateTenant(viewingTenant.id);
    setViewingTenant(null);
    showToast({
      title: 'Company Reactivated',
      description: `${viewingTenant.name} is now ACTIVE.`,
      family: 'success',
    });
  };

  if (isLoadingTenants && tenants.length === 0) {
    return <LoadingState variant="cards" />;
  }

  if (isTenantsError && tenants.length === 0) {
    return (
      <ErrorState
        title="Failed to load Platform Admin Console"
        message="Could not connect to system realm endpoints. Verify Super Admin credentials."
        onRetry={() => void handleRefreshAll()}
      />
    );
  }

  const activeTenantsCount = tenants.filter((t) => t.status === 'ACTIVE').length;
  const suspendedTenantsCount = tenants.filter((t) => t.status === 'SUSPENDED').length;

  return (
    <div className="container-page space-y-6">
      <PlatformDashboardHeader
        isLoading={isLoadingHealth || isLoadingTenants}
        onRefreshAll={() => void handleRefreshAll()}
        onOpenLicense={() => {
          setSelectedTenantForLicense(null);
          setIsLicenseOpen(true);
        }}
        onOpenOnboard={() => setIsOnboardOpen(true)}
      />

      <ClusterTelemetryConsole
        health={health}
        isLoading={isLoadingHealth}
        onRefresh={() => void handleRefreshAll()}
        activeTenantsCount={activeTenantsCount}
        suspendedTenantsCount={suspendedTenantsCount}
        totalTenantsCount={tenants.length}
        totalLicensesCount={licenses.length}
      />

      <PlatformFastNavCards
        totalTenants={tenants.length}
        activeTenantsCount={activeTenantsCount}
        suspendedTenantsCount={suspendedTenantsCount}
        totalLicenses={licenses.length}
        health={health}
        totalAuditLogs={auditLogs.length}
      />

      <PlatformDashboardTabs
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        tenants={tenants}
        licenses={licenses}
        auditLogs={auditLogs}
        isLoadingLicenses={isLoadingLicenses}
        isLoadingAuditLogs={isLoadingAuditLogs}
        onViewTenant={(tenant) => setViewingTenant(tenant)}
        onOpenLicenseGenerator={(tenant) => {
          setSelectedTenantForLicense(tenant);
          setIsLicenseOpen(true);
        }}
        onToggleSuspend={(tenant) => void handleToggleSuspend(tenant)}
        onOpenIssueLicense={() => {
          setSelectedTenantForLicense(null);
          setIsLicenseOpen(true);
        }}
        isMutatingStatus={isMutatingStatus}
      />

      <OnboardTenantModal
        isOpen={isOnboardOpen}
        onClose={() => setIsOnboardOpen(false)}
        onSubmit={handleOnboardSubmit}
        isSubmitting={isOnboarding}
      />

      <LicenseGeneratorModal
        isOpen={isLicenseOpen}
        onClose={() => {
          setIsLicenseOpen(false);
          setSelectedTenantForLicense(null);
        }}
        tenants={tenants}
        preselectedTenant={selectedTenantForLicense}
        onGenerate={handleLicenseGenerate}
        isGenerating={isGeneratingLicense}
      />

      <TenantDetailModal
        isOpen={Boolean(viewingTenant)}
        tenant={viewingTenant}
        onClose={() => setViewingTenant(null)}
        onSuspend={handleConfirmSuspend}
        onReactivate={handleReactivateViewingTenant}
        isMutating={isMutatingStatus}
      />
    </div>
  );
}
