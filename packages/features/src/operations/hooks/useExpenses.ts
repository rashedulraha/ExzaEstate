import { useQueryClient } from '@tanstack/react-query';
import {
  useExpenseControllerListCategories,
  useExpenseControllerCreateVoucher,
  useExpenseControllerSubmitVoucher,
  useExpenseControllerApproveVoucher,
  useExpenseControllerVerifyVoucher,
  useExpenseControllerPayVoucher,
  useExpenseControllerRejectVoucher,
} from '@exzaestate/api-client';
import type {
  CreateExpenseInput,
  PayExpenseInput,
  RejectExpenseInput,
  ExpenseVoucherItem,
  ExpenseCategoryItem,
} from '../schemas/operations.schema.js';

export function useExpenses() {
  const queryClient = useQueryClient();

  const categoriesQuery = useExpenseControllerListCategories({ activeOnly: true });

  const createMutation = useExpenseControllerCreateVoucher();
  const submitMutation = useExpenseControllerSubmitVoucher();
  const approveMutation = useExpenseControllerApproveVoucher();
  const verifyMutation = useExpenseControllerVerifyVoucher();
  const payMutation = useExpenseControllerPayVoucher();
  const rejectMutation = useExpenseControllerRejectVoucher();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/v1/expenses'] });
  };

  const createVoucher = async (input: CreateExpenseInput) => {
    const res = await createMutation.mutateAsync({
      data: {
        categoryId: input.categoryId,
        projectId: input.projectId,
        costCenter: input.costCenter,
        payeeName: input.payeeName,
        vendorId: input.vendorId,
        amountPaisa: input.amountPaisa,
        description: input.description,
        expenseDate: input.expenseDate,
        paymentMethod: input.paymentMethod,
        paidLater: input.paidLater,
        bankAccountId: input.bankAccountId,
        bankAccountCode: input.bankAccountCode,
      },
    });
    invalidateAll();
    return res;
  };

  const submitVoucher = async (id: string) => {
    const res = await submitMutation.mutateAsync({ id });
    invalidateAll();
    return res;
  };

  const approveVoucher = async (id: string) => {
    const res = await approveMutation.mutateAsync({ id });
    invalidateAll();
    return res;
  };

  const verifyVoucher = async (id: string) => {
    const res = await verifyMutation.mutateAsync({ id });
    invalidateAll();
    return res;
  };

  const payVoucher = async (id: string, input?: PayExpenseInput) => {
    const res = await payMutation.mutateAsync({
      id,
      data: input
        ? {
            paymentMethod: input.paymentMethod,
            bankAccountId: input.bankAccountId,
            bankAccountCode: input.bankAccountCode,
          }
        : {},
    });
    invalidateAll();
    return res;
  };

  const rejectVoucher = async (id: string, input: RejectExpenseInput) => {
    const res = await rejectMutation.mutateAsync({
      id,
      data: { reason: input.reason },
    });
    invalidateAll();
    return res;
  };

  return {
    vouchers: [] as ExpenseVoucherItem[],
    isLoading: false,
    refetch: () => {},
    categories: (categoriesQuery.data || []) as ExpenseCategoryItem[],
    isLoadingCategories: categoriesQuery.isLoading,
    createVoucher,
    submitVoucher,
    approveVoucher,
    verifyVoucher,
    payVoucher,
    rejectVoucher,
    isSubmitting:
      createMutation.isPending ||
      submitMutation.isPending ||
      approveMutation.isPending ||
      verifyMutation.isPending ||
      payMutation.isPending ||
      rejectMutation.isPending,
  };
}
