import { useQueryClient } from '@tanstack/react-query';
import {
  useCommissionControllerCreateBroker,
  useCommissionControllerCreateRule,
  useCommissionControllerApproveCommission,
  useCommissionControllerPayCommission,
  useCommissionControllerAccrueCommission,
} from '@exzaestate/api-client';
import type {
  CreateBrokerInput,
  CreateCommissionRuleInput,
  PayCommissionInput,
  BrokerItem,
  CommissionRuleItem,
  CommissionPayableItem,
} from '../schemas/operations.schema.js';

export function useCommissions() {
  const queryClient = useQueryClient();

  const createBrokerMutation = useCommissionControllerCreateBroker();
  const createRuleMutation = useCommissionControllerCreateRule();
  const approveMutation = useCommissionControllerApproveCommission();
  const payMutation = useCommissionControllerPayCommission();
  const accrueMutation = useCommissionControllerAccrueCommission();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/v1/commissions'] });
  };

  const createBroker = async (input: CreateBrokerInput) => {
    const res = await createBrokerMutation.mutateAsync({
      data: input,
    });
    invalidateAll();
    return res;
  };

  const createRule = async (input: CreateCommissionRuleInput) => {
    const res = await createRuleMutation.mutateAsync({
      data: input,
    });
    invalidateAll();
    return res;
  };

  const approveCommission = async (id: string) => {
    const res = await approveMutation.mutateAsync({ id });
    invalidateAll();
    return res;
  };

  const payCommission = async (id: string, input?: PayCommissionInput) => {
    const res = await payMutation.mutateAsync({
      id,
      data: input ?? {},
    });
    invalidateAll();
    return res;
  };

  const accrueCommission = async (bookingId: string) => {
    const res = await accrueMutation.mutateAsync({ bookingId });
    invalidateAll();
    return res;
  };

  return {
    brokers: [] as BrokerItem[],
    rules: [] as CommissionRuleItem[],
    commissions: [] as CommissionPayableItem[],
    isLoadingBrokers: false,
    refetchBrokers: () => {},
    createBroker,
    createRule,
    approveCommission,
    payCommission,
    accrueCommission,
    isSubmitting:
      createBrokerMutation.isPending ||
      createRuleMutation.isPending ||
      approveMutation.isPending ||
      payMutation.isPending ||
      accrueMutation.isPending,
  };
}
