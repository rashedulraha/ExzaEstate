export interface QueryKpiFilterDto {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  branchId?: string;
  salesExecutiveId?: string;
}

export interface ScopeFilterContext {
  scope?: 'OWN' | 'TEAM' | 'BRANCH' | 'ALL';
  userId?: string;
  teamUserIds?: string[];
  branchIds?: string[];
}

export interface InventoryStatusBreakdown {
  totalUnits: number;
  availableUnits: number;
  bookedUnits: number;
  soldUnits: number;
  reservedUnits: number;
  blockedUnits: number;
  totalInventoryValuePaisa: string;
  availableInventoryValuePaisa: string;
}

export interface ManagementKpis {
  asOfDate: string;
  period: {
    startDate?: string;
    endDate?: string;
  };
  totalSalesPaisa: string;
  totalSalesCount: number;
  totalCollectionPaisa: string;
  totalCollectionCount: number;
  outstandingReceivablePaisa: string;
  overdueAmountPaisa: string;
  overdueInstallmentsCount: number;
  totalExpensePaisa: string;
  accountsPayablePaisa: string;
  cashBankBalancePaisa: string;
  inventory: InventoryStatusBreakdown;
  performance: {
    leadConversionRatePercent: number;
    collectionEfficiencyPercent: number;
  };
}

export interface SalespersonPerformanceDto {
  salesExecutiveId: string;
  salesExecutiveName: string;
  confirmedBookingsCount: number;
  totalSalesValuePaisa: string;
  totalCollectedPaisa: string;
  leadsAssignedCount: number;
  leadsConvertedCount: number;
  conversionRatePercent: number;
}
