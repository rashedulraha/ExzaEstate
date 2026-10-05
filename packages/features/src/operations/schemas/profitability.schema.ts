export interface ProjectProfitabilityCostBreakdown {
  landCostPaisa: string;
  developmentCostPaisa: string;
  marketingCostPaisa: string;
  adminCostPaisa: string;
  otherCostPaisa: string;
  totalCostPaisa: string;
}

export interface ProjectProfitabilityItem {
  projectId: string;
  projectCode: string;
  projectName: string;
  totalRevenuePaisa: string;
  costBreakdown: ProjectProfitabilityCostBreakdown;
  totalCostPaisa: string;
  netProfitPaisa: string;
  profitMarginPercent: number;
  isProfitable: boolean;
  estimatedBudgetPaisa?: string | { [key: string]: unknown } | null;
  budgetVariancePaisa?: string | { [key: string]: unknown } | null;
}
