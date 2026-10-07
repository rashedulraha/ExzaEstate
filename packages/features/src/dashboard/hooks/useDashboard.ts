import {
  useDashboardControllerGetSummary,
  useDashboardControllerGetSalesPerformance,
  type DashboardControllerGetSummaryParams,
  type DashboardControllerGetSalesPerformanceParams,
} from '@exzaestate/api-client';

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

export function useDashboard(params?: DashboardControllerGetSummaryParams) {
  const summaryQuery = useDashboardControllerGetSummary(params, {
    query: {
      placeholderData: (prev) => prev,
    },
  });
  const salesPerformanceQuery = useDashboardControllerGetSalesPerformance(
    params as DashboardControllerGetSalesPerformanceParams,
    {
      query: {
        placeholderData: (prev) => prev,
      },
    },
  );

  return {
    summary: summaryQuery.data as ManagementKpis | undefined,
    salesPerformance: salesPerformanceQuery.data as SalespersonPerformanceDto[] | undefined,
    isLoading: summaryQuery.isLoading || salesPerformanceQuery.isLoading,
    isError: summaryQuery.isError || salesPerformanceQuery.isError,
    error: summaryQuery.error || salesPerformanceQuery.error,
    refetch: async () => {
      await Promise.all([summaryQuery.refetch(), salesPerformanceQuery.refetch()]);
    },
  };
}
