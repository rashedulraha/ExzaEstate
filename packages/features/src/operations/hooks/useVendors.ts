import { useQueryClient } from '@tanstack/react-query';
import {
  useVendorControllerListVendors,
  useVendorControllerCreateVendor,
  useVendorBillControllerCreateBill,
  useVendorBillControllerPostBill,
  useVendorPaymentControllerCreatePayment,
} from '@exzaestate/api-client';
import type {
  CreateVendorInput,
  CreateVendorBillInput,
  CreateVendorPaymentInput,
  VendorBillItem,
} from '../schemas/operations.schema.js';

export function useVendors() {
  const queryClient = useQueryClient();

  const vendorsQuery = useVendorControllerListVendors({ isActive: true });

  const createVendorMutation = useVendorControllerCreateVendor();
  const createBillMutation = useVendorBillControllerCreateBill();
  const postBillMutation = useVendorBillControllerPostBill();
  const createPaymentMutation = useVendorPaymentControllerCreatePayment();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/v1/vendors'] });
  };

  const createVendor = async (input: CreateVendorInput) => {
    const res = await createVendorMutation.mutateAsync({
      data: input,
    });
    invalidateAll();
    return res;
  };

  const createBill = async (input: CreateVendorBillInput) => {
    const res = await createBillMutation.mutateAsync({
      data: {
        vendorId: input.vendorId,
        projectId: input.projectId,
        billDate: input.billDate,
        dueDate: input.dueDate,
        taxWithholdingPaisa: input.taxWithholdingPaisa,
        vatWithholdingPaisa: input.vatWithholdingPaisa,
        notes: input.notes,
        postImmediately: input.postImmediately,
        lines: input.lines,
      },
    });
    invalidateAll();
    return res;
  };

  const postBill = async (billId: string) => {
    const res = await postBillMutation.mutateAsync({ id: billId });
    invalidateAll();
    return res;
  };

  const createPayment = async (input: CreateVendorPaymentInput) => {
    const res = await createPaymentMutation.mutateAsync({
      data: {
        vendorId: input.vendorId,
        amountPaisa: input.amountPaisa,
        paymentMethod: input.paymentMethod,
        bankAccountId: input.bankAccountId,
        bankAccountCode: input.bankAccountCode,
        paymentDate: input.paymentDate,
        reference: input.reference,
        notes: input.notes,
        allocations: input.allocations,
      },
    });
    invalidateAll();
    return res;
  };

  return {
    vendors: vendorsQuery.data || [],
    isLoadingVendors: vendorsQuery.isLoading,
    refetchVendors: vendorsQuery.refetch,
    bills: [] as VendorBillItem[],
    refetchBills: () => {},
    createVendor,
    createBill,
    postBill,
    createPayment,
    isSubmitting:
      createVendorMutation.isPending ||
      createBillMutation.isPending ||
      postBillMutation.isPending ||
      createPaymentMutation.isPending,
  };
}
