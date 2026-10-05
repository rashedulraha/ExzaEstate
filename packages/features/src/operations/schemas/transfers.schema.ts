export interface BookingTransferInput {
  originalBookingId: string;
  transfereeCustomerId: string;
  transferFeePaisa?: string;
  reason?: string;
  executeImmediately?: boolean;
}

export interface BookingTransferResult {
  transferNumber: string;
  originalBookingId: string;
  successorBookingId: string;
  transfereeCustomerId: string;
  transferredAt: string;
}
