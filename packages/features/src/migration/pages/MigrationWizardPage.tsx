import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Calendar, BookOpen, Receipt, CheckCircle2, AlertCircle } from 'lucide-react';
import { Breadcrumbs, StatCard } from '@exzaestate/ui';
import { useMigration } from '../hooks/useMigration.js';
import { MigrationBatchHeader } from '../components/MigrationBatchHeader.js';
import { OpeningBalancesStep } from '../components/OpeningBalancesStep.js';
import { LegacyBookingsStep } from '../components/LegacyBookingsStep.js';
import { CsvImportSection } from '../components/CsvImportSection.js';
import { ReconciliationGateCard } from '../components/ReconciliationGateCard.js';
import { FinalizeMigrationDialog } from '../components/FinalizeMigrationDialog.js';
import type {
  MigrationBatchItem,
  CreateBatchFormData,
  ReconciliationGateResult,
} from '../schemas/migration.schema.js';

type MigrationStep = 'opening' | 'bookings' | 'csv' | 'reconciliation';

function MigrationReconciliationKpi({
  reconciliation,
}: {
  reconciliation?: ReconciliationGateResult | null;
}) {
  const canFinalize = Boolean(reconciliation?.canFinalize);
  return (
    <StatCard
      label="Ledger Reconciliation"
      value={canFinalize ? 'Zero Variance' : reconciliation?.differenceFormatted || 'Pending'}
      variant={canFinalize ? 'success' : 'warning'}
      icon={
        canFinalize ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />
      }
    />
  );
}

function MigrationStepContent({
  currentStep,
  batchId,
  migration,
  onOpenFinalize,
}: {
  currentStep: MigrationStep;
  batchId: string;
  migration: ReturnType<typeof useMigration>;
  onOpenFinalize: () => void;
}) {
  if (currentStep === 'opening') {
    return (
      <OpeningBalancesStep
        batchId={batchId}
        onPostOpening={migration.postOpeningBalance}
        isPosting={migration.isSubmitting}
      />
    );
  }
  if (currentStep === 'bookings') {
    return (
      <LegacyBookingsStep
        batchId={batchId}
        onAddBooking={migration.addLegacyBooking}
        isAdding={migration.isSubmitting}
      />
    );
  }
  if (currentStep === 'csv') {
    return (
      <CsvImportSection
        onValidateCsv={migration.validateCsv}
        onImportCsv={migration.importCsv}
        isProcessing={migration.isSubmitting}
      />
    );
  }
  return (
    <ReconciliationGateCard
      reconciliation={migration.reconciliation}
      onOpenFinalize={onOpenFinalize}
      onRefresh={() => migration.refetchReconciliation()}
      isLoading={migration.isLoadingReconciliation}
    />
  );
}

function MigrationKpiCards({
  activeBatch,
  reconciliation,
}: {
  activeBatch: MigrationBatchItem | null;
  reconciliation?: ReconciliationGateResult | null;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="Cut-Over Date"
        value={activeBatch?.goLiveDate || 'Pending Init'}
        icon={<Calendar className="w-4 h-4" />}
      />
      <StatCard
        label="Opening AR (1200)"
        value={reconciliation?.totalOpeningArFormatted || 'BDT 0.00'}
        variant="brand"
        icon={<BookOpen className="w-4 h-4" />}
      />
      <StatCard
        label="Legacy Receivables"
        value={reconciliation?.totalLegacyOutstandingFormatted || 'BDT 0.00'}
        icon={<Receipt className="w-4 h-4" />}
      />
      <MigrationReconciliationKpi reconciliation={reconciliation} />
    </div>
  );
}

export function MigrationWizardPage() {
  const navigate = useNavigate();
  const [activeBatch, setActiveBatch] = useState<MigrationBatchItem | null>(null);
  const [currentStep, setCurrentStep] = useState<MigrationStep>('opening');
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);

  const migration = useMigration(activeBatch?.id);

  const handleCreateBatch = async (data: CreateBatchFormData) => {
    const res = await migration.createBatch(data);
    setActiveBatch(res);
  };

  const handleFinalize = async (reason?: string) => {
    if (!activeBatch) return;
    const res = (await migration.finalizeBatch(
      activeBatch.id,
      reason,
    )) as unknown as MigrationBatchItem;
    setActiveBatch(res);
  };

  const steps: Array<{ id: MigrationStep; label: string }> = [
    { id: 'opening', label: '1. Opening Balances' },
    { id: 'bookings', label: '2. Legacy Bookings' },
    { id: 'csv', label: '3. Bulk CSV Import' },
    { id: 'reconciliation', label: '4. Reconciliation Gate' },
  ];

  return (
    <div className="container-page space-y-6">
      {/* Tier 1: Breadcrumbs & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Overview', href: '/dashboard', onClick: () => navigate('/dashboard') },
              { label: 'Workspace & Admin' },
              { label: 'Data Migration' },
            ]}
          />
          <div className="flex items-center gap-3 mt-1.5">
            <h1 className="text-h1 font-bold text-text">Go-Live Data Migration Wizard</h1>
            <span className="text-caption font-semibold px-2.5 py-0.5 rounded-full bg-surface-sunken text-primary border border-primary/20">
              {activeBatch ? activeBatch.batchNumber : 'Draft Batch'}
            </span>
          </div>
          <p className="text-body text-text-muted mt-1">
            Import previous customer records, opening balances, and ensure figures balance before
            go-live.
          </p>
        </div>
      </div>

      {/* Tier 2: 4 KPI Summary Cards */}
      <MigrationKpiCards activeBatch={activeBatch} reconciliation={migration.reconciliation} />

      <MigrationBatchHeader
        batch={activeBatch}
        onCreateBatch={handleCreateBatch}
        isCreating={migration.isSubmitting}
      />

      {activeBatch && (
        <>
          {/* Stepper Navigation */}
          <div className="border border-border bg-surface-sunken p-1.5 rounded-card">
            <nav className="grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="Migration Steps">
              {steps.map((st) => {
                const isActive = currentStep === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setCurrentStep(st.id)}
                    className={`px-4 py-2.5 rounded-button text-body-sm font-medium transition-all text-center cursor-pointer ${
                      isActive
                        ? 'bg-surface border border-border text-primary shadow-xs ring-1 ring-primary/20'
                        : 'text-text-muted hover:text-text hover:bg-surface/50 border border-transparent'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <MigrationStepContent
            currentStep={currentStep}
            batchId={activeBatch.id}
            migration={migration}
            onOpenFinalize={() => setIsFinalizeOpen(true)}
          />

          <FinalizeMigrationDialog
            isOpen={isFinalizeOpen}
            onClose={() => setIsFinalizeOpen(false)}
            onFinalize={handleFinalize}
            isCanFinalize={Boolean(migration.reconciliation?.canFinalize)}
            isFinalizing={migration.isSubmitting}
          />
        </>
      )}
    </div>
  );
}
