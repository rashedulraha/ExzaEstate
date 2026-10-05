import { useQueryClient } from '@tanstack/react-query';
import {
  useMigrationControllerCreateBatch,
  useMigrationControllerPostOpeningBalance,
  useMigrationControllerAddLegacyBooking,
  useMigrationControllerGetReconciliationGate,
  useMigrationControllerFinalizeBatch,
  useCsvMigrationControllerValidate,
  useCsvMigrationControllerImport,
} from '@exzaestate/api-client';
import type {
  CreateBatchFormData,
  PostOpeningBalanceFormData,
  LegacyBookingFormData,
  ReconciliationGateResult,
  MigrationBatchItem,
} from '../schemas/migration.schema.js';

export function useMigration(activeBatchId?: string) {
  const queryClient = useQueryClient();

  const createBatchMutation = useMigrationControllerCreateBatch();
  const postOpeningMutation = useMigrationControllerPostOpeningBalance();
  const addLegacyBookingMutation = useMigrationControllerAddLegacyBooking();
  const finalizeBatchMutation = useMigrationControllerFinalizeBatch();

  const csvValidateMutation = useCsvMigrationControllerValidate();
  const csvImportMutation = useCsvMigrationControllerImport();

  const reconciliationQuery = useMigrationControllerGetReconciliationGate(activeBatchId || '', {
    query: { enabled: Boolean(activeBatchId) },
  });

  const invalidateBatch = () => {
    if (activeBatchId) {
      queryClient.invalidateQueries({
        queryKey: [`/api/v1/migration/batches/${activeBatchId}/reconciliation`],
      });
    }
    queryClient.invalidateQueries({ queryKey: ['/api/v1/migration/batches'] });
  };

  const createBatch = async (data: CreateBatchFormData) => {
    const res = await createBatchMutation.mutateAsync({ data });
    invalidateBatch();
    return res as unknown as MigrationBatchItem;
  };

  const postOpeningBalance = async (batchId: string, data: PostOpeningBalanceFormData) => {
    const res = await postOpeningMutation.mutateAsync({
      batchId,
      data,
    });
    invalidateBatch();
    return res;
  };

  const addLegacyBooking = async (batchId: string, data: LegacyBookingFormData) => {
    const res = await addLegacyBookingMutation.mutateAsync({
      batchId,
      data,
    });
    invalidateBatch();
    return res;
  };

  const finalizeBatch = async (batchId: string, approvedAdjustmentReason?: string) => {
    const res = await finalizeBatchMutation.mutateAsync({
      batchId,
      data: { approvedAdjustmentReason },
    });
    invalidateBatch();
    return res;
  };

  const validateCsv = async (entity: string, csvContent: string) => {
    return csvValidateMutation.mutateAsync({
      entity,
      data: { csvContent },
    });
  };

  const importCsv = async (entity: string, csvContent: string) => {
    const res = await csvImportMutation.mutateAsync({
      entity,
      data: { csvContent },
    });
    invalidateBatch();
    return res;
  };

  return {
    reconciliation: reconciliationQuery.data as ReconciliationGateResult | undefined,
    isLoadingReconciliation: reconciliationQuery.isLoading,
    refetchReconciliation: reconciliationQuery.refetch,
    createBatch,
    postOpeningBalance,
    addLegacyBooking,
    finalizeBatch,
    validateCsv,
    importCsv,
    isSubmitting:
      createBatchMutation.isPending ||
      postOpeningMutation.isPending ||
      addLegacyBookingMutation.isPending ||
      finalizeBatchMutation.isPending ||
      csvValidateMutation.isPending ||
      csvImportMutation.isPending,
  };
}
