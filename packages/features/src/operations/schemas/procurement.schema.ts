import type {
  PurchaseRequestStatus,
  PurchaseOrderStatus,
  GoodsReceiptStatus,
} from '@exzaestate/shared';

export interface PurchaseRequestLineItem {
  id?: string;
  itemDescription: string;
  category: string;
  quantity: string;
  unit: string;
  estimatedUnitPricePaisa: string;
  estimatedAmountPaisa?: string;
  notes?: string;
}

export interface PurchaseRequestItem {
  id: string;
  prNumber: string;
  title: string;
  projectId?: string | null;
  department?: string | null;
  requestedById: string;
  requestedByName?: string | null;
  requiredDate?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: PurchaseRequestStatus;
  totalEstimatedPaisa: string;
  approvedById?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  createdAt: string;
  lines: PurchaseRequestLineItem[];
}

export interface CreatePurchaseRequestFormInput {
  title: string;
  projectId?: string;
  department?: string;
  requiredDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  notes?: string;
  lines: Array<{
    itemDescription: string;
    category?: string;
    quantity: string;
    unit?: string;
    estimatedUnitPricePaisa: string;
    notes?: string;
  }>;
}

export interface PurchaseOrderLineItem {
  id?: string;
  prLineId?: string;
  itemDescription: string;
  category: string;
  quantity: string;
  receivedQuantity?: string;
  billedQuantity?: string;
  unit: string;
  unitPricePaisa: string;
  totalAmountPaisa: string;
  notes?: string;
}

export interface PurchaseOrderItem {
  id: string;
  poNumber: string;
  prId?: string | null;
  vendorId: string;
  vendor?: {
    id: string;
    name: string;
    vendorNumber: string;
    phone?: string | null;
  } | null;
  projectId?: string | null;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  deliveryAddress?: string | null;
  status: PurchaseOrderStatus;
  totalAmountPaisa: string;
  receivedAmountPaisa: string;
  billedAmountPaisa: string;
  notes?: string | null;
  termsAndConditions?: string | null;
  createdAt: string;
  lines: PurchaseOrderLineItem[];
}

export interface CreatePurchaseOrderFormInput {
  vendorId: string;
  prId?: string;
  projectId?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  deliveryAddress?: string;
  termsAndConditions?: string;
  notes?: string;
  lines: Array<{
    prLineId?: string;
    itemDescription: string;
    category?: string;
    quantity: string;
    unit?: string;
    unitPricePaisa: string;
    notes?: string;
  }>;
}

export interface ConvertPrToPoFormInput {
  vendorId: string;
  expectedDeliveryDate?: string;
  deliveryAddress?: string;
  termsAndConditions?: string;
  notes?: string;
}

export interface GoodsReceiptLineItem {
  id?: string;
  poLineId?: string;
  itemDescription: string;
  receivedQuantity: string;
  acceptedQuantity: string;
  rejectedQuantity?: string;
  unit: string;
  unitPricePaisa: string;
  totalAmountPaisa: string;
  rejectionReason?: string;
  notes?: string;
}

export interface GoodsReceiptItem {
  id: string;
  grnNumber: string;
  poId: string;
  purchaseOrder?: {
    id: string;
    poNumber: string;
    status: PurchaseOrderStatus;
  } | null;
  vendorId: string;
  vendor?: {
    id: string;
    name: string;
    vendorNumber: string;
  } | null;
  projectId?: string | null;
  receiptDate: string;
  challanNumber?: string | null;
  status: GoodsReceiptStatus;
  receivedById: string;
  receivedByName?: string | null;
  totalAmountPaisa: string;
  notes?: string | null;
  createdAt: string;
  lines: GoodsReceiptLineItem[];
  bills?: Array<{ id: string; billNumber: string }>;
}

export interface CreateGoodsReceiptFormInput {
  poId: string;
  receiptDate?: string;
  challanNumber?: string;
  notes?: string;
  lines: Array<{
    poLineId?: string;
    itemDescription: string;
    receivedQuantity: string;
    acceptedQuantity: string;
    rejectedQuantity?: string;
    unit?: string;
    unitPricePaisa: string;
    rejectionReason?: string;
    notes?: string;
  }>;
}
