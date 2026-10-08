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

export const PURCHASE_REQUEST_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CONVERTED_TO_PO: 'CONVERTED_TO_PO',
  CANCELLED: 'CANCELLED',
} as const;

export type PurchaseRequestStatus =
  (typeof PURCHASE_REQUEST_STATUS)[keyof typeof PURCHASE_REQUEST_STATUS];

export const PURCHASE_ORDER_STATUS = {
  DRAFT: 'DRAFT',
  ORDERED: 'ORDERED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const;

export type PurchaseOrderStatus =
  (typeof PURCHASE_ORDER_STATUS)[keyof typeof PURCHASE_ORDER_STATUS];

export const GOODS_RECEIPT_STATUS = {
  DRAFT: 'DRAFT',
  RECEIVED: 'RECEIVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;

export type GoodsReceiptStatus = (typeof GOODS_RECEIPT_STATUS)[keyof typeof GOODS_RECEIPT_STATUS];

export const PROCUREMENT_ITEM_CATEGORIES = [
  'CEMENT',
  'STEEL_ROD',
  'SAND',
  'BRICKS',
  'ELECTRICAL',
  'PLUMBING',
  'FINISHING',
  'SAFETY',
  'EQUIPMENT',
  'SERVICES',
  'GENERAL',
] as const;

export type ProcurementItemCategory = (typeof PROCUREMENT_ITEM_CATEGORIES)[number];
