import {
  useReportsControllerGetProjectProfitability,
  useReportsControllerExportProfitability,
} from '@exzaestate/api-client';

export function useProfitability(params?: {
  startDate?: string;
  endDate?: string;
  projectId?: string;
}) {
  const reportQuery = useReportsControllerGetProjectProfitability(params);
  const exportMutation = useReportsControllerExportProfitability();

  const exportReport = async (format: 'PDF' | 'EXCEL' | 'CSV' = 'PDF') => {
    return exportMutation.mutateAsync({
      data: {
        format,
        startDate: params?.startDate,
        endDate: params?.endDate,
        projectId: params?.projectId,
      },
    });
  };

  return {
    report: reportQuery.data,
    isLoading: reportQuery.isLoading,
    refetch: reportQuery.refetch,
    exportReport,
    isExporting: exportMutation.isPending,
  };
}
