import { useQueryClient } from '@tanstack/react-query';
import { useSetupChecklistControllerGetChecklist } from '@exzaestate/api-client';
import type { SetupChecklistResult } from '../schemas/setup.schema.js';

export function useSetupChecklist() {
  const queryClient = useQueryClient();

  const checklistQuery = useSetupChecklistControllerGetChecklist();

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/v1/setup/checklist'] });
    return checklistQuery.refetch();
  };

  return {
    checklist: checklistQuery.data as SetupChecklistResult | undefined,
    isLoading: checklistQuery.isLoading,
    isError: checklistQuery.isError,
    refetch,
  };
}
