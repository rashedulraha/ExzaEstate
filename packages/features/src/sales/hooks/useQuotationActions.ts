import { useQueryClient } from '@tanstack/react-query';
import {
  useQuotationControllerCreateQuotation,
  useQuotationControllerSendQuotation,
  useQuotationControllerApproveQuotation,
  useQuotationControllerRejectQuotation,
  getQuotationControllerGetQuotationsQueryKey,
} from '@exzaestate/api-client';
import { useToast } from '@exzaestate/ui';
import type { QuotationFormInput } from '../schemas/quotation.schema.js';

export function useQuotationActions() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: getQuotationControllerGetQuotationsQueryKey() });
  };

  const createMutation = useQuotationControllerCreateQuotation({
    mutation: {
      onSuccess: () => {
        invalidate();
        showToast({
          family: 'success',
          title: 'Quotation Generated',
          description: 'Official quotation draft and pricing schedule created.',
        });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to create quotation';
        showToast({ family: 'danger', title: 'Quotation Error', description: msg });
      },
    },
  });

  const sendMutation = useQuotationControllerSendQuotation({
    mutation: {
      onSuccess: () => {
        invalidate();
        showToast({
          family: 'info',
          title: 'Quotation Dispatched',
          description: 'Quotation PDF and terms transmitted to client.',
        });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to send quotation';
        showToast({ family: 'danger', title: 'Dispatch Error', description: msg });
      },
    },
  });

  const approveMutation = useQuotationControllerApproveQuotation({
    mutation: {
      onSuccess: () => {
        invalidate();
        showToast({
          family: 'success',
          title: 'Quotation Approved',
          description: 'Quotation discount approved. Ready for booking conversion.',
        });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Approval failed';
        showToast({ family: 'danger', title: 'Error', description: msg });
      },
    },
  });

  const rejectMutation = useQuotationControllerRejectQuotation({
    mutation: {
      onSuccess: () => {
        invalidate();
        showToast({
          family: 'warning',
          title: 'Quotation Declined',
          description: 'Quotation marked rejected.',
        });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Rejection failed';
        showToast({ family: 'danger', title: 'Error', description: msg });
      },
    },
  });

  return {
    createQuotation: (data: QuotationFormInput) =>
      createMutation.mutateAsync({
        data: {
          propertyId: data.propertyId,
          customerId: data.customerId || undefined,
          leadId: data.leadId || undefined,
          validDays: data.validDays,
          basePricePaisa: data.basePricePaisa,
          premiumAmountPaisa: data.premiumAmountPaisa,
          discountPct: data.discountPct,
          discountAmountPaisa: data.discountAmountPaisa,
          paymentPlanTemplateId: data.paymentPlanTemplateId || undefined,
          bookingAmountPaisa: data.bookingAmountPaisa,
          downPaymentPaisa: data.downPaymentPaisa,
          installmentCount: data.installmentCount,
          frequency: data.frequency,
          notes: data.notes,
          terms: data.terms,
        },
      }),
    sendQuotation: (id: string) => sendMutation.mutateAsync({ id }),
    approveQuotation: (id: string) => approveMutation.mutateAsync({ id }),
    rejectQuotation: (id: string, _reason?: string) => rejectMutation.mutateAsync({ id }),
    isCreating: createMutation.isPending,
    isSending: sendMutation.isPending,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}
