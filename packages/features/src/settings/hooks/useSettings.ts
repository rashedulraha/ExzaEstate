import { useQueryClient } from '@tanstack/react-query';
import {
  useSettingsControllerGetAllSettings,
  useSettingsControllerUpdateSetting,
  useSettingsControllerUpdateBatch,
  useNumberingControllerListPatterns,
  useNumberingControllerUpdatePattern,
  useNumberingControllerPreview,
} from '@exzaestate/api-client';
import type { NumberingPatternFormData } from '../schemas/settings.schema.js';

export function useSettings() {
  const queryClient = useQueryClient();

  const settingsQuery = useSettingsControllerGetAllSettings();
  const updateSettingMutation = useSettingsControllerUpdateSetting();
  const updateBatchMutation = useSettingsControllerUpdateBatch();

  const invalidateSettings = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/v1/settings'] });
  };

  const updateSetting = async (key: string, value: unknown) => {
    const res = await updateSettingMutation.mutateAsync({
      key,
      data: { value },
    });
    invalidateSettings();
    return res;
  };

  const updateBatchSettings = async (settings: Array<{ key: string; value: unknown }>) => {
    const res = await updateBatchMutation.mutateAsync({
      data: { settings },
    });
    invalidateSettings();
    return res;
  };

  return {
    settings: (settingsQuery.data as Record<string, unknown> | undefined) || {},
    isLoading: settingsQuery.isLoading,
    isError: settingsQuery.isError,
    refetch: settingsQuery.refetch,
    updateSetting,
    updateBatchSettings,
    isUpdating: updateSettingMutation.isPending || updateBatchMutation.isPending,
  };
}

export function useNumbering() {
  const queryClient = useQueryClient();

  const patternsQuery = useNumberingControllerListPatterns();
  const updatePatternMutation = useNumberingControllerUpdatePattern();

  const invalidatePatterns = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/v1/numbering/patterns'] });
  };

  const updatePattern = async (documentType: string, data: NumberingPatternFormData) => {
    const res = await updatePatternMutation.mutateAsync({
      documentType,
      data,
    });
    invalidatePatterns();
    return res;
  };

  return {
    patterns:
      (patternsQuery.data as
        | Array<{
            id: string;
            documentType: string;
            prefix: string | null;
            pattern: string;
            resetRule: 'NEVER' | 'YEARLY' | 'FISCAL_YEARLY';
            nextSequence: number;
            isActive: boolean;
            updatedAt: string;
          }>
        | undefined) || [],
    isLoading: patternsQuery.isLoading,
    isError: patternsQuery.isError,
    refetch: patternsQuery.refetch,
    updatePattern,
    isUpdating: updatePatternMutation.isPending,
  };
}

export function useNumberingPreview(params?: {
  documentType?: string;
  pattern?: string;
  prefix?: string;
  branchCode?: string;
  projectCode?: string;
  year?: string;
}) {
  const isEnabled = Boolean(params?.documentType);
  const previewQuery = useNumberingControllerPreview({
    request: { params: params || {} },
    query: { enabled: isEnabled },
  });

  return {
    previewData: previewQuery.data as
      | {
          documentType: string;
          sampleNumber: string;
          resolvedPattern: string;
          pattern: string;
        }
      | undefined,
    isLoading: previewQuery.isLoading,
    refetch: previewQuery.refetch,
  };
}
