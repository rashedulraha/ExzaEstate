import {
  usePaymentControllerCreateDraftPayment,
  usePaymentControllerPostPayment,
  useReversalControllerReversePayment,
} from '@exzaestate/api-client';
import type { PaymentEntryInput, PaymentReversalInput } from '../schemas/collection.schema.js';

export function usePaymentActions() {
  const createDraftMutation = usePaymentControllerCreateDraftPayment();
  const postPaymentMutation = usePaymentControllerPostPayment();
  const reversePaymentMutation = useReversalControllerReversePayment();

  const createDraftPayment = async (data: PaymentEntryInput): Promise<{ id?: string }> => {
    const mutate = createDraftMutation.mutateAsync as unknown as (args: {
      data: Record<string, unknown>;
    }) => Promise<{ id?: string }>;

    const res = await mutate({
      data: {
        bookingId: data.bookingId,
        amountPaisa: data.amountPaisa,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        referenceNotes: data.referenceNotes,
        chequeNumber: data.chequeNumber,
        chequeBank: data.chequeBank,
        chequeBranch: data.chequeBranch,
        chequeDate: data.chequeDate,
        chequeDrawer: data.chequeDrawer,
        mobileTrxId: data.mobileTrxId,
        mobileSenderPhone: data.mobileSenderPhone,
        bankName: data.bankName,
        bankAccountRef: data.bankAccountRef,
        cardLast4: data.cardLast4,
        cardSlipRef: data.cardSlipRef,
      },
    });
    return res ?? {};
  };

  const postPayment = async (paymentId: string) => {
    return postPaymentMutation.mutateAsync({
      id: paymentId,
    });
  };

  const reversePayment = async (data: PaymentReversalInput) => {
    return reversePaymentMutation.mutateAsync({
      id: data.paymentId,
      data: {
        reason: data.reason,
      },
    });
  };

  return {
    createDraftPayment,
    postPayment,
    reversePayment,
    isSubmitting:
      createDraftMutation.isPending ||
      postPaymentMutation.isPending ||
      reversePaymentMutation.isPending,
  };
}
