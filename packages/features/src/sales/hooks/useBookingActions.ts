import { useQueryClient } from '@tanstack/react-query';
import {
  bookingControllerCreateBooking,
  useBookingControllerCancelBooking,
  getBookingControllerListBookingsQueryKey,
} from '@exzaestate/api-client';
import { useToast } from '@exzaestate/ui';
import type { BookingWizardInput } from '../schemas/booking.schema.js';

export function useBookingActions() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: getBookingControllerListBookingsQueryKey() });
  };

  const cancelMutation = useBookingControllerCancelBooking({
    mutation: {
      onSuccess: () => {
        invalidate();
        showToast({
          family: 'info',
          title: 'Booking Cancelled',
          description: 'Booking reservation released and audited.',
        });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Cancellation failed';
        showToast({ family: 'danger', title: 'Cancellation Error', description: msg });
      },
    },
  });

  const createBooking = async (input: BookingWizardInput) => {
    try {
      const idempotencyKey = input.idempotencyKey ?? crypto.randomUUID();
      const payload = {
        propertyId: input.propertyId,
        customerId: input.customerId,
        leadId: input.leadId || undefined,
        quotationId: input.quotationId || undefined,
        salesExecutiveId: input.salesExecutiveId || undefined,
        brokerId: input.brokerId || undefined,
        basePricePaisa: input.basePricePaisa,
        discountAmountPaisa: input.discountAmountPaisa,
        discountPercentage: input.discountPercentage,
        netPricePaisa: input.netPricePaisa,
        paymentPlanTemplateId: input.paymentPlanTemplateId || undefined,
        reservationHoldHours: input.reservationHoldHours,
        coBuyers: input.coBuyers.map((cb) => ({
          customerId: cb.customerId,
          sharePercentage: cb.sharePercentage,
        })),
        notes: input.notes,
        terms: input.terms,
      };

      const res = await bookingControllerCreateBooking({
        data: payload,
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });

      invalidate();
      showToast({
        family: 'success',
        title: 'Booking Created',
        description: 'Property reserved successfully with atomic lock.',
      });
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Booking creation failed';
      showToast({ family: 'danger', title: 'Booking Error', description: msg });
      throw err;
    }
  };

  return {
    createBooking,
    cancelBooking: (_id: string, _reason: string) => cancelMutation.mutateAsync({ id: _id }),
    isCancelling: cancelMutation.isPending,
  };
}
