export const VENDOR_BILL_STATUS = {
  DRAFT: 'DRAFT',
  POSTED: 'POSTED',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;

export type VendorBillStatus = (typeof VENDOR_BILL_STATUS)[keyof typeof VENDOR_BILL_STATUS];

export const VENDOR_PAYMENT_STATUS = {
  DRAFT: 'DRAFT',
  APPROVED: 'APPROVED',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;

export type VendorPaymentStatus =
  (typeof VENDOR_PAYMENT_STATUS)[keyof typeof VENDOR_PAYMENT_STATUS];
