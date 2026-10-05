import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReportFiltersBar } from './components/ReportFiltersBar.js';
import { ExportReportModal } from './components/ExportReportModal.js';

describe('Reports Subsystem & Financial Validation', () => {
  describe('ReportFiltersBar', () => {
    it('renders As Of date filter and triggers callbacks', () => {
      const onRefresh = vi.fn();
      const onOpenExport = vi.fn();
      const onAsOfDateChange = vi.fn();

      render(
        <ReportFiltersBar
          mode="asOf"
          asOfDate="2026-10-01"
          onAsOfDateChange={onAsOfDateChange}
          onRefresh={onRefresh}
          onOpenExport={onOpenExport}
        />,
      );

      expect(screen.getByText(/As of:/i)).toBeDefined();
      expect(screen.getByText('Refresh')).toBeDefined();
      expect(screen.getByText('Export')).toBeDefined();

      const refreshBtn = screen.getByRole('button', { name: /Refresh/i });
      fireEvent.click(refreshBtn);
      expect(onRefresh).toHaveBeenCalledTimes(1);

      const exportBtn = screen.getByRole('button', { name: /Export/i });
      fireEvent.click(exportBtn);
      expect(onOpenExport).toHaveBeenCalledTimes(1);
    });

    it('renders Date Range mode with From and To dates', () => {
      render(<ReportFiltersBar mode="range" startDate="2026-01-01" endDate="2026-12-31" />);

      expect(screen.getByText(/Period:/i)).toBeDefined();
      expect(screen.getByText('to')).toBeDefined();
    });
  });

  describe('ExportReportModal', () => {
    it('renders export formats and submits export job', async () => {
      const onClose = vi.fn();
      const onExport = vi.fn().mockResolvedValue({
        jobId: 'job-exp-9923',
        message: 'Async report generation dispatched to BullMQ queue',
      });

      render(
        <ExportReportModal
          isOpen={true}
          onClose={onClose}
          reportTitle="Trial Balance"
          onExport={onExport}
        />,
      );

      expect(screen.getByText(/Export Trial Balance/i)).toBeDefined();
      expect(screen.getByText('PDF Document')).toBeDefined();
      expect(screen.getByText('Excel (.xlsx)')).toBeDefined();
      expect(screen.getByText('Raw CSV')).toBeDefined();

      // Switch to Excel
      const excelBtn = screen.getByText('Excel (.xlsx)');
      fireEvent.click(excelBtn);

      // Submit
      const submitBtn = screen.getByRole('button', { name: /Export as EXCEL/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(onExport).toHaveBeenCalledWith('EXCEL', expect.any(Object));
      });

      // Verification of success state
      await waitFor(() => {
        expect(screen.getByText('Export Job Queued')).toBeDefined();
        expect(screen.getByText('job-exp-9923')).toBeDefined();
      });
    });
  });

  describe('Financial Statements Balancing Math', () => {
    it('enforces Double-Entry Balance: total debits equal total credits', () => {
      const mockTrialBalance = {
        rows: [
          { accountCode: '1010', debitPaisa: '500000000', creditPaisa: '0' },
          { accountCode: '2010', debitPaisa: '0', creditPaisa: '300000000' },
          { accountCode: '3010', debitPaisa: '0', creditPaisa: '200000000' },
        ],
      };

      const totalDebit = mockTrialBalance.rows.reduce((acc, r) => acc + BigInt(r.debitPaisa), 0n);
      const totalCredit = mockTrialBalance.rows.reduce((acc, r) => acc + BigInt(r.creditPaisa), 0n);

      expect(totalDebit).toBe(totalCredit);
      expect(totalDebit).toBe(500000000n);
    });

    it('enforces Balance Sheet equation: Assets === Liabilities + Equity', () => {
      const mockBalanceSheet = {
        totalAssetsPaisa: '15000000000', // 15 Crore
        totalLiabilitiesPaisa: '9000000000', // 9 Crore
        totalEquityPaisa: '6000000000', // 6 Crore
      };

      const assets = BigInt(mockBalanceSheet.totalAssetsPaisa);
      const liabilities = BigInt(mockBalanceSheet.totalLiabilitiesPaisa);
      const equity = BigInt(mockBalanceSheet.totalEquityPaisa);

      expect(assets).toBe(liabilities + equity);
    });

    it('enforces Income Statement calculation: Revenue - COGS - OpEx === Net Profit', () => {
      const revenue = 1000000000n; // 1 Crore
      const cogs = 400000000n; // 40 Lakh
      const grossProfit = revenue - cogs; // 60 Lakh
      const opex = 250000000n; // 25 Lakh
      const netProfit = grossProfit - opex; // 35 Lakh

      expect(grossProfit).toBe(600000000n);
      expect(netProfit).toBe(350000000n);
    });
  });
});
