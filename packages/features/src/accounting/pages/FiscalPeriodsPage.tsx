import { useState } from 'react';
import { useFiscalPeriods } from '../hooks/useFiscalPeriods.js';
import { PeriodManagementView } from '../components/periods/PeriodManagementView.js';
import { PeriodActionDialog } from '../components/periods/PeriodActionDialog.js';
import type { FiscalPeriodItem } from '../schemas/accounting.schema.js';

export function FiscalPeriodsPage() {
  const {
    selectedFiscalYearId,
    setSelectedFiscalYearId,
    fiscalYears,
    periods,
    isLoading,
    closePeriod,
    reopenPeriod,
    lockPeriod,
    isSubmitting,
  } = useFiscalPeriods();

  const [activeDialog, setActiveDialog] = useState<{
    isOpen: boolean;
    period: FiscalPeriodItem | null;
    action: 'CLOSE' | 'REOPEN' | 'LOCK';
  }>({
    isOpen: false,
    period: null,
    action: 'CLOSE',
  });

  const handleOpenCloseDialog = (period: FiscalPeriodItem) => {
    setActiveDialog({
      isOpen: true,
      period,
      action: 'CLOSE',
    });
  };

  const handleOpenReopenDialog = (period: FiscalPeriodItem) => {
    setActiveDialog({
      isOpen: true,
      period,
      action: 'REOPEN',
    });
  };

  const handleDialogSubmit = async (periodId: string, text: string) => {
    if (activeDialog.action === 'CLOSE') {
      await closePeriod(periodId, text);
    } else if (activeDialog.action === 'REOPEN') {
      await reopenPeriod(periodId, text);
    } else if (activeDialog.action === 'LOCK') {
      await lockPeriod(periodId);
    }
  };

  return (
    <div className="space-y-6" data-testid="fiscal-periods-page">
      <div>
        <h1 className="text-h1 font-bold text-text">Fiscal Calendar & Periods</h1>
        <p className="text-small text-text-muted mt-1">
          Monthly accounting period lifecycle, closing procedures, and audit reopening controls.
        </p>
      </div>

      <PeriodManagementView
        fiscalYears={fiscalYears}
        selectedFiscalYearId={selectedFiscalYearId}
        onSelectFiscalYear={setSelectedFiscalYearId}
        periods={periods}
        isLoading={isLoading}
        onClosePeriod={handleOpenCloseDialog}
        onReopenPeriod={handleOpenReopenDialog}
      />

      <PeriodActionDialog
        isOpen={activeDialog.isOpen}
        period={activeDialog.period}
        action={activeDialog.action}
        onClose={() =>
          setActiveDialog({
            isOpen: false,
            period: null,
            action: 'CLOSE',
          })
        }
        onSubmit={handleDialogSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
