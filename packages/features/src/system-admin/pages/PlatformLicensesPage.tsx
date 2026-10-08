import { useState } from 'react';
import { useNavigate } from 'react-router';
import { KeyRound, Plus, RefreshCw, ShieldCheck, Cpu, CheckCircle2 } from 'lucide-react';
import { useToast, Breadcrumbs, Button, LoadingState } from '@exzaestate/ui';
import { useSystemAdmin } from '../hooks/useSystemAdmin.js';
import { PlatformLicensesTable } from '../components/PlatformLicensesTable.js';
import { LicenseGeneratorModal } from '../components/LicenseGeneratorModal.js';
import type { GenerateLicenseFormData } from '../schemas/system-admin.schema.js';

export function PlatformLicensesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    tenants,
    licenses,
    isLoadingLicenses,
    refetchLicenses,
    generateLicense,
    isGeneratingLicense,
  } = useSystemAdmin();

  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);

  const handleRefresh = async () => {
    await refetchLicenses();
    showToast({
      title: 'Licenses Refreshed',
      description: 'Platform license registry synchronized with database.',
      family: 'info',
    });
  };

  const handleLicenseGenerate = async (data: GenerateLicenseFormData) => {
    try {
      const res = await generateLicense(data);
      showToast({
        title: 'License Issued',
        description: 'Software license generated and activated successfully.',
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

  if (isLoadingLicenses && licenses.length === 0) {
    return <LoadingState variant="cards" />;
  }

  const activeLicensesCount = licenses.filter((l) => l.status === 'ACTIVE').length;
  const machineBoundCount = licenses.filter((l) => Boolean(l.machineId)).length;

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
            { label: 'Software Licenses' },
          ]}
        />
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-h1 font-semibold tracking-tight text-text">
              Software Licenses &amp; Subscriptions
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-medium bg-primary/10 text-primary border border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Verified Licenses
            </span>
          </div>
          <p className="text-small text-text-muted">
            Manage, issue, and oversee active software licenses and capacity limits for client
            companies.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="p-2 rounded-button text-text-muted hover:text-text bg-surface hover:bg-surface-sunken border border-border transition cursor-pointer active:scale-[0.96]"
            title="Refresh licenses"
            aria-label="Refresh licenses"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLicenses ? 'animate-spin' : ''}`} />
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsLicenseModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Issue New License
          </Button>
        </div>
      </div>

      {/* Metric Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
            <span>Total Licenses Issued</span>
            <KeyRound className="w-4 h-4 text-primary" />
          </div>
          <div className="text-h1 font-semibold text-text tracking-tight font-mono tabular-nums">
            {licenses.length}
          </div>
          <div className="text-caption text-text-muted mt-1">
            All company licenses created in the system
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
            <span>Active Licenses</span>
            <CheckCircle2 className="w-4 h-4 text-success" />
          </div>
          <div className="text-h1 font-semibold text-success tracking-tight font-mono tabular-nums">
            {activeLicensesCount}
          </div>
          <div className="text-caption text-text-muted mt-1">
            Currently valid and active subscriptions
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
            <span>Device-Locked Licenses</span>
            <Cpu className="w-4 h-4 text-text-muted" />
          </div>
          <div className="text-h1 font-semibold text-text tracking-tight font-mono tabular-nums">
            {machineBoundCount}
          </div>
          <div className="text-caption text-text-muted mt-1">
            Locked to specific office computers for extra protection
          </div>
        </div>

        <div className="rounded-card border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-caption text-text-muted font-medium mb-1">
            <span>License Protection</span>
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div className="text-h1 font-semibold text-primary tracking-tight">Tamper-Proof</div>
          <div className="text-caption text-text-muted mt-1">
            Digital signature prevents unauthorized duplication
          </div>
        </div>
      </div>

      {/* Main Table */}
      <PlatformLicensesTable
        licenses={licenses}
        isLoading={isLoadingLicenses}
        onOpenIssueModal={() => setIsLicenseModalOpen(true)}
      />

      {/* Modal */}
      <LicenseGeneratorModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        tenants={tenants}
        onGenerate={handleLicenseGenerate}
        isGenerating={isGeneratingLicense}
      />
    </div>
  );
}
