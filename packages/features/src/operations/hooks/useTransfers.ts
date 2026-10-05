import { useQueryClient } from '@tanstack/react-query';
import { useBookingTransferControllerExecuteTransfer } from '@exzaestate/api-client';
import type { BookingTransferInput } from '../schemas/operations.schema.js';

export function useTransfers() {
  const queryClient = useQueryClient();

  const transferMutation = useBookingTransferControllerExecuteTransfer();

  const executeTransfer = async (input: BookingTransferInput) => {
    const res = await transferMutation.mutateAsync({
      data: {
        originalBookingId: input.originalBookingId,
        transfereeCustomerId: input.transfereeCustomerId,
        transferFeePaisa: input.transferFeePaisa,
        reason: input.reason,
        executeImmediately: input.executeImmediately,
      },
    });
    queryClient.invalidateQueries({ queryKey: ['/api/v1/sales/bookings'] });
    queryClient.invalidateQueries({ queryKey: ['/api/v1/properties'] });
    return res;
  };

  return {
    executeTransfer,
    isSubmitting: transferMutation.isPending,
  };
}
