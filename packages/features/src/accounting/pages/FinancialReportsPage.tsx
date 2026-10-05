import { useState } from 'react';
import {
  useTrialBalance,
  useBalanceSheet,
  useIncomeStatement,
} from '../hooks/useFinancialStatements.js';
import { TrialBalanceView } from '../components/reports/TrialBalanceView.js';
import { BalanceSheetView } from '../components/reports/BalanceSheetView.js';
import { IncomeStatementView } from '../components/reports/IncomeStatementView.js';

type StatementTab = 'TRIAL_BALANCE' | 'BALANCE_SHEET' | 'INCOME_STATEMENT';

interface TabButtonProps {
  id: StatementTab;
  activeTab: StatementTab;
  label: string;
  onClick: (id: StatementTab) => void;
}

function TabButton({ id, activeTab, label, onClick }: TabButtonProps) {
  const isActive = activeTab === id;
  return (
    <button
      type="button"
      data-testid={`tab-${id.toLowerCase().replace('_', '-')}`}
      onClick={() => onClick(id)}
      className={`px-4 py-2.5 text-body font-medium transition-colors border-b-2 -mb-px ${
        isActive
          ? 'border-primary text-primary font-bold'
          : 'border-transparent text-text-muted hover:text-text'
      }`}
    >
      {label}
    </button>
  );
}

export function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState<StatementTab>('TRIAL_BALANCE');

  const tb = useTrialBalance();
  const bs = useBalanceSheet();
  const is = useIncomeStatement();

  return (
    <div className="space-y-6" data-testid="financial-reports-page">
      <div>
        <h1 className="text-h1 font-bold text-text">Financial Statements & Reports</h1>
        <p className="text-small text-text-muted mt-1">
          Standard general ledger financial reports, balance verification, and operating results.
        </p>
      </div>

      {/* Report Switcher Tabs */}
      <div className="border-b border-border flex items-center gap-2">
        <TabButton
          id="TRIAL_BALANCE"
          activeTab={activeTab}
          label="Trial Balance"
          onClick={setActiveTab}
        />
        <TabButton
          id="BALANCE_SHEET"
          activeTab={activeTab}
          label="Balance Sheet"
          onClick={setActiveTab}
        />
        <TabButton
          id="INCOME_STATEMENT"
          activeTab={activeTab}
          label="Income Statement (P&L)"
          onClick={setActiveTab}
        />
      </div>

      {/* Tab Panels */}
      {activeTab === 'TRIAL_BALANCE' && (
        <TrialBalanceView
          rows={tb.rows}
          totalDebitPaisa={tb.totalDebitPaisa}
          totalCreditPaisa={tb.totalCreditPaisa}
          isBalanced={tb.isBalanced}
          differencePaisa={tb.differencePaisa}
          asOfDate={tb.asOfDate}
          onDateChange={tb.setAsOfDate}
          isLoading={tb.isLoading}
        />
      )}

      {activeTab === 'BALANCE_SHEET' && (
        <BalanceSheetView
          report={bs.data}
          asOfDate={bs.asOfDate}
          onDateChange={bs.setAsOfDate}
          isLoading={bs.isLoading}
        />
      )}

      {activeTab === 'INCOME_STATEMENT' && (
        <IncomeStatementView
          report={is.data}
          startDate={is.startDate}
          endDate={is.endDate}
          onStartDateChange={is.setStartDate}
          onEndDateChange={is.setEndDate}
          isLoading={is.isLoading}
        />
      )}
    </div>
  );
}
