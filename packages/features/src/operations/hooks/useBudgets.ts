import { useQueryClient } from '@tanstack/react-query';
import {
  useBudgetControllerListBudgets,
  useBudgetControllerCreateBudget,
} from '@exzaestate/api-client';
import type { CreateBudgetInput } from '../schemas/operations.schema.js';

export function useBudgets(params?: { projectId?: string; fiscalYear?: string }) {
  const queryClient = useQueryClient();

  const budgetsQuery = useBudgetControllerListBudgets(params);
  const createBudgetMutation = useBudgetControllerCreateBudget();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/v1/expenses/budgets'] });
  };

  const createBudget = async (input: CreateBudgetInput) => {
    const res = await createBudgetMutation.mutateAsync({
      data: input,
    });
    invalidateAll();
    return res;
  };

  return {
    budgets: budgetsQuery.data || [],
    isLoadingBudgets: budgetsQuery.isLoading,
    refetchBudgets: budgetsQuery.refetch,
    createBudget,
    isSubmitting: createBudgetMutation.isPending,
  };
}
