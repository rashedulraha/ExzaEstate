import { useState } from 'react';
import { useMigration } from '../hooks/useMigration.js';
import { MigrationBatchHeader } from '../components/MigrationBatchHeader.js';
import { OpeningBalancesStep } from '../components/OpeningBalancesStep.js';
import { LegacyBookingsStep } from '../components/LegacyBookingsStep.js';
import { CsvImportSection } from '../components/CsvImportSection.js';
import { ReconciliationGateCard } from '../components/ReconciliationGateCard.js';
import { FinalizeMigrationDialog } from '../components/FinalizeMigrationDialog.js';
import type { MigrationBatchItem, CreateBatchFormData } from '../schemas/migration.schema.js';

type MigrationStep = 'opening' | 'bookings' | 'csv' | 'reconciliation';

export function MigrationWizardPage() {
  const [activeBatch, setActiveBatch] = useState<MigrationBatchItem | null>(null);
  const [currentStep, setCurrentStep] = useState<MigrationStep>('opening');
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);

  const {
    reconciliation,
    isLoadingReconciliation,
    refetchReconciliation,
    createBatch,
    postOpeningBalance,
    addLegacyBooking,
    finalizeBatch,
    validateCsv,
    importCsv,
    isSubmitting,
  } = useMigration(activeBatch?.id);

  const handleCreateBatch = async (data: CreateBatchFormData) => {
    const res = await createBatch(data);
    setActiveBatch(res);
  };

  const handleFinalize = async (reason?: string) => {
    if (!activeBatch) return;
    const res = (await finalizeBatch(activeBatch.id, reason)) as unknown as MigrationBatchItem;
    setActiveBatch(res);
  };

  const steps: Array<{ id: MigrationStep; label: string }> = [
    { id: 'opening', label: '1. Opening Balances' },
    { id: 'bookings', label: '2. Legacy Bookings' },
    { id: 'csv', label: '3. Bulk CSV Import' },
    { id: 'reconciliation', label: '4. Reconciliation Gate' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 font-bold text-text">Go-Live Data Migration Wizard</h1>
          <p className="text-body text-text-muted mt-1">
            Enterprise legacy data import, cut-over opening balances, and AT-29 reconciliation gate
            (FLOW-03).
          </p>
        </div>
      </div>

      <MigrationBatchHeader
        batch={activeBatch}
        onCreateBatch={handleCreateBatch}
        isCreating={isSubmitting}
      />

      {activeBatch && (
        <>
          <div className="border-b border-border bg-surface-elevated/40 rounded-card p-1">
            <nav className="flex space-x-2">
              {steps.map((st) => {
                const isActive = currentStep === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setCurrentStep(st.id)}
                    className={`px-4 py-2.5 rounded-button text-body-sm font-medium transition-all ${
                      isActive
                        ? 'bg-surface-elevated border border-border text-primary shadow-sm ring-1 ring-primary/20'
                        : 'text-text-muted hover:text-text hover:bg-surface-sunken/40'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {currentStep === 'opening' && (
            <OpeningBalancesStep
              batchId={activeBatch.id}
              onPostOpening={postOpeningBalance}
              isPosting={isSubmitting}
            />
          )}

          {currentStep === 'bookings' && (
            <LegacyBookingsStep
              batchId={activeBatch.id}
              onAddBooking={addLegacyBooking}
              isAdding={isSubmitting}
            />
          )}

          {currentStep === 'csv' && (
            <CsvImportSection
              onValidateCsv={validateCsv}
              onImportCsv={importCsv}
              isProcessing={isSubmitting}
            />
          )}

          {currentStep === 'reconciliation' && (
            <ReconciliationGateCard
              reconciliation={reconciliation}
              onOpenFinalize={() => setIsFinalizeOpen(true)}
              onRefresh={() => refetchReconciliation()}
              isLoading={isLoadingReconciliation}
            />
          )}

          <FinalizeMigrationDialog
            isOpen={isFinalizeOpen}
            onClose={() => setIsFinalizeOpen(false)}
            onFinalize={handleFinalize}
            isCanFinalize={Boolean(reconciliation?.canFinalize)}
            isFinalizing={isSubmitting}
          />
        </>
      )}
    </div>
  );
}
