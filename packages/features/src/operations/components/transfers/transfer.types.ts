export interface BookingOption {
  id: string;
  bookingNumber: string;
  customerName: string;
  customerId: string;
  propertyName: string;
  totalPricePaisa: string;
  paidAmountPaisa: string;
}

export interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
}
