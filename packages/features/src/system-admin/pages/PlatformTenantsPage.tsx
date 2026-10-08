import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, KeyRound, RefreshCw } from 'lucide-react';
import { useToast, Breadcrumbs, Button, LoadingState, ErrorState } from '@exzaestate/ui';
import { useSystemAdmin } from '../hooks/useSystemAdmin.js';
import { PlatformTenantsMetricStrip } from '../components/PlatformTenantsMetricStrip.js';
import { TenantDirectoryTable } from '../components/TenantDirectoryTable.js';
import { OnboardTenantModal } from '../components/OnboardTenantModal.js';
import { LicenseGeneratorModal } from '../components/LicenseGeneratorModal.js';
import { TenantDetailModal } from '../components/TenantDetailModal.js';
import type {
  TenantItem,
  OnboardTenantFormData,
  GenerateLicenseFormData,
} from '../schemas/system-admin.schema.js';

export function PlatformTenantsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    tenants,
    isLoadingTenants,
    isTenantsError,
    refetchTenants,
    licenses,
    onboardTenant,
    isOnboarding,
    suspendTenant,
    reactivateTenant,
    generateLicense,
    isGeneratingLicense,
  } = useSystemAdmin();

  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);
  const [selectedTenantForLicense, setSelectedTenantForLicense] = useState<TenantItem | null>(null);
  const [viewingTenant, setViewingTenant] = useState<TenantItem | null>(null);
  const [isMutatingStatus, setIsMutatingStatus] = useState(false);

  const handleRefresh = async () => {
    await refetchTenants();
    showToast({
      title: 'Tenants Refreshed',
      description: 'Tenants directory updated with latest database records.',
      family: 'info',
    });
  };

  const handleOnboardSubmit = async (data: OnboardTenantFormData) => {
    try {
      const res = await onboardTenant(data);
      showToast({
        title: 'Company Provisioned',
        description: `Tenant ${data.name} (${res.companyCode}) successfully created.`,
        family: 'success',
      });
      setIsOnboardOpen(false);
    } catch (err) {
      showToast({
        title: 'Provisioning Failed',
        description: err instanceof Error ? err.message : 'Unable to onboard tenant company.',
        family: 'danger',
      });
    }
  };

  const handleLicenseGenerate = async (data: GenerateLicenseFormData) => {
    try {
      const res = await generateLicense(data);
      showToast({
        title: 'License Issued',
        description: 'Software license generated and saved successfully.',
        family: 'success',
      });
      return res;
    } catch (err) {
      showToast({
        title: 'Generation Failed',
        description: err instanceof Error ? err.message : 'Could not issue license.',
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
        title="Failed to load Tenants Directory"
        message="Could not retrieve tenant companies from platform realm."
        onRetry={() => void handleRefresh()}
      />
    );
  }

  const activeCount = tenants.filter((t) => t.status === 'ACTIVE').length;
  const suspendedCount = tenants.filter((t) => t.status === 'SUSPENDED').length;

  return (
    <div className="container-page space-y-6">
      {/* Breadcrumbs */}
      <div>
        <Breadcrumbs
          items={[
            {
              label: 'Overview Dashboard',
              href: '/system/dashboard',
              onClick: () => navigate('/system/dashboard'),
            },
            { label: 'Companies & Licenses' },
            { label: 'Company Directory' },
          ]}
        />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-h1 font-semibold tracking-tight text-text">
              Company Directory &amp; Workspaces
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium bg-primary/10 text-primary border border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Company Management
            </span>
          </div>
          <p className="text-small text-text-muted">
            View registered client companies, manage operational access, and oversee office
            branches.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="p-2 rounded-button text-text-muted hover:text-text bg-surface hover:bg-surface-sunken border border-border transition cursor-pointer active:scale-[0.96]"
            title="Refresh companies"
            aria-label="Refresh companies"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTenants ? 'animate-spin' : ''}`} />
          </button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSelectedTenantForLicense(null);
              setIsLicenseOpen(true);
            }}
            leftIcon={<KeyRound className="w-3.5 h-3.5" />}
          >
            Issue License
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsOnboardOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Register Company
          </Button>
        </div>
      </div>

      {/* Metric Cards Strip */}
      <PlatformTenantsMetricStrip
        totalCount={tenants.length}
        activeCount={activeCount}
        suspendedCount={suspendedCount}
        licenseCount={licenses.length}
      />

      {/* Main Tenant Table */}
      <TenantDirectoryTable
        tenants={tenants}
        onViewDetails={(tenant) => setViewingTenant(tenant)}
        onOpenLicenseGenerator={(tenant) => {
          setSelectedTenantForLicense(tenant);
          setIsLicenseOpen(true);
        }}
        onToggleSuspend={(tenant) => void handleToggleSuspend(tenant)}
        isMutating={isMutatingStatus}
      />

      {/* Modals */}
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
