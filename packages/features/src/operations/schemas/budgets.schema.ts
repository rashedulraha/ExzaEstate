export interface BudgetItem {
  id: string;
  projectId?: string | null;
  projectName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  fiscalYear: string;
  budgetAmountPaisa: string;
  actualSpendPaisa: string;
  spendPercentage: number;
  alertLevel: 'NORMAL' | 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface CreateBudgetInput {
  projectId?: string;
  categoryId?: string;
  fiscalYear: string;
  budgetAmountPaisa: string;
}
