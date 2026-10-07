import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useExpenseControllerListCategories,
  useExpenseControllerCreateVoucher,
  useExpenseControllerSubmitVoucher,
  useExpenseControllerApproveVoucher,
  useExpenseControllerVerifyVoucher,
  useExpenseControllerPayVoucher,
  useExpenseControllerRejectVoucher,
  http,
} from '@exzaestate/api-client';
import type {
  CreateExpenseInput,
  PayExpenseInput,
  RejectExpenseInput,
  ExpenseVoucherItem,
  ExpenseCategoryItem,
} from '../schemas/operations.schema.js';

export interface UseExpensesOptions {
  status?: string;
  projectId?: string;
  categoryId?: string;
}

function extractItems<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (
    raw &&
    typeof raw === 'object' &&
    'items' in raw &&
    Array.isArray((raw as { items: unknown }).items)
  ) {
    return (raw as { items: T[] }).items;
  }
  if (
    raw &&
    typeof raw === 'object' &&
    'data' in raw &&
    Array.isArray((raw as { data: unknown }).data)
  ) {
    return (raw as { data: T[] }).data;
  }
  return [];
}

export function useExpenses(options?: UseExpensesOptions) {
  const queryClient = useQueryClient();

  const categoriesQuery = useExpenseControllerListCategories({ activeOnly: true });

  const vouchersQuery = useQuery({
    queryKey: ['/api/v1/expenses/vouchers', options],
    queryFn: async () => {
      return http.get<{ items: ExpenseVoucherItem[]; total: number }>('/api/v1/expenses/vouchers', {
        params: options,
      });
    },
  });

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

  const rawCategories = extractItems<ExpenseCategoryItem>(categoriesQuery.data);
  const rawVouchers = extractItems<ExpenseVoucherItem>(vouchersQuery.data);

  return {
    vouchers: rawVouchers,
    isLoading: vouchersQuery.isLoading,
    refetch: () => vouchersQuery.refetch(),
    categories: rawCategories,
    isLoadingCategories: categoriesQuery.isLoading,
    refetchCategories: () => categoriesQuery.refetch(),
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
