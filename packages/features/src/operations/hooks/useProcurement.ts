import { useQueryClient } from '@tanstack/react-query';
import {
  usePurchaseRequestControllerFindAll,
  usePurchaseRequestControllerCreate,
  usePurchaseRequestControllerSubmit,
  usePurchaseRequestControllerApprove,
  usePurchaseRequestControllerReject,
  usePurchaseRequestControllerConvertToPo,
  usePurchaseOrderControllerFindAll,
  usePurchaseOrderControllerCreate,
  usePurchaseOrderControllerCancel,
  usePurchaseOrderControllerClose,
  useGoodsReceiptControllerFindAll,
  useGoodsReceiptControllerCreate,
  useGoodsReceiptControllerCreateBill,
} from '@exzaestate/api-client';
import type {
  CreatePurchaseRequestFormInput,
  CreatePurchaseOrderFormInput,
  ConvertPrToPoFormInput,
  CreateGoodsReceiptFormInput,
  PurchaseRequestItem,
  PurchaseOrderItem,
  GoodsReceiptItem,
} from '../schemas/procurement.schema.js';

export function useProcurement() {
  const queryClient = useQueryClient();

  const prQuery = usePurchaseRequestControllerFindAll();
  const poQuery = usePurchaseOrderControllerFindAll();
  const grnQuery = useGoodsReceiptControllerFindAll();

  const createPrMutation = usePurchaseRequestControllerCreate();
  const submitPrMutation = usePurchaseRequestControllerSubmit();
  const approvePrMutation = usePurchaseRequestControllerApprove();
  const rejectPrMutation = usePurchaseRequestControllerReject();
  const convertPrToPoMutation = usePurchaseRequestControllerConvertToPo();

  const createPoMutation = usePurchaseOrderControllerCreate();
  const cancelPoMutation = usePurchaseOrderControllerCancel();
  const closePoMutation = usePurchaseOrderControllerClose();

  const createGrnMutation = useGoodsReceiptControllerCreate();
  const createBillFromGrnMutation = useGoodsReceiptControllerCreateBill();

  const invalidateProcurement = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/v1/procurement/purchase-requests'] });
    queryClient.invalidateQueries({ queryKey: ['/api/v1/procurement/purchase-orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/v1/procurement/goods-receipts'] });
    queryClient.invalidateQueries({ queryKey: ['/api/v1/vendors'] });
  };

  const createPurchaseRequest = async (input: CreatePurchaseRequestFormInput) => {
    const res = await createPrMutation.mutateAsync({
      data: {
        title: input.title,
        projectId: input.projectId,
        department: input.department,
        requiredDate: input.requiredDate,
        priority: input.priority,
        notes: input.notes,
        lines: input.lines.map((l) => ({
          itemDescription: l.itemDescription,
          category: l.category,
          quantity: l.quantity,
          unit: l.unit,
          estimatedUnitPricePaisa: l.estimatedUnitPricePaisa,
          notes: l.notes,
        })),
      },
    });
    invalidateProcurement();
    return res;
  };

  const submitPurchaseRequest = async (id: string) => {
    const res = await submitPrMutation.mutateAsync({ id });
    invalidateProcurement();
    return res;
  };

  const approvePurchaseRequest = async (id: string) => {
    const res = await approvePrMutation.mutateAsync({ id });
    invalidateProcurement();
    return res;
  };

  const rejectPurchaseRequest = async (id: string, reason: string) => {
    const res = await rejectPrMutation.mutateAsync({ id, data: { reason } });
    invalidateProcurement();
    return res;
  };

  const convertPrToPo = async (id: string, input: ConvertPrToPoFormInput) => {
    const res = await convertPrToPoMutation.mutateAsync({
      id,
      data: {
        vendorId: input.vendorId,
        expectedDeliveryDate: input.expectedDeliveryDate,
        deliveryAddress: input.deliveryAddress,
        termsAndConditions: input.termsAndConditions,
        notes: input.notes,
      },
    });
    invalidateProcurement();
    return res;
  };

  const createPurchaseOrder = async (input: CreatePurchaseOrderFormInput) => {
    const res = await createPoMutation.mutateAsync({
      data: {
        vendorId: input.vendorId,
        prId: input.prId,
        projectId: input.projectId,
        orderDate: input.orderDate,
        expectedDeliveryDate: input.expectedDeliveryDate,
        deliveryAddress: input.deliveryAddress,
        termsAndConditions: input.termsAndConditions,
        notes: input.notes,
        lines: input.lines.map((l) => ({
          prLineId: l.prLineId,
          itemDescription: l.itemDescription,
          category: l.category,
          quantity: l.quantity,
          unit: l.unit,
          unitPricePaisa: l.unitPricePaisa,
          notes: l.notes,
        })),
      },
    });
    invalidateProcurement();
    return res;
  };

  const cancelPurchaseOrder = async (id: string) => {
    const res = await cancelPoMutation.mutateAsync({ id });
    invalidateProcurement();
    return res;
  };

  const closePurchaseOrder = async (id: string) => {
    const res = await closePoMutation.mutateAsync({ id });
    invalidateProcurement();
    return res;
  };

  const createGoodsReceipt = async (input: CreateGoodsReceiptFormInput) => {
    const res = await createGrnMutation.mutateAsync({
      data: {
        poId: input.poId,
        receiptDate: input.receiptDate,
        challanNumber: input.challanNumber,
        notes: input.notes,
        lines: input.lines.map((l) => ({
          poLineId: l.poLineId,
          itemDescription: l.itemDescription,
          receivedQuantity: l.receivedQuantity,
          acceptedQuantity: l.acceptedQuantity,
          rejectedQuantity: l.rejectedQuantity,
          unit: l.unit,
          unitPricePaisa: l.unitPricePaisa,
          rejectionReason: l.rejectionReason,
          notes: l.notes,
        })),
      },
    });
    invalidateProcurement();
    return res;
  };

  const createBillFromGrn = async (id: string) => {
    const res = await createBillFromGrnMutation.mutateAsync({ id });
    invalidateProcurement();
    return res;
  };

  const purchaseRequests = ((prQuery.data as unknown as { items?: PurchaseRequestItem[] })?.items ||
    []) as PurchaseRequestItem[];
  const purchaseOrders = ((poQuery.data as unknown as { items?: PurchaseOrderItem[] })?.items ||
    []) as PurchaseOrderItem[];
  const goodsReceipts = ((grnQuery.data as unknown as { items?: GoodsReceiptItem[] })?.items ||
    []) as GoodsReceiptItem[];

  return {
    purchaseRequests,
    isLoadingPr: prQuery.isLoading,
    refetchPr: prQuery.refetch,
    purchaseOrders,
    isLoadingPo: poQuery.isLoading,
    refetchPo: poQuery.refetch,
    goodsReceipts,
    isLoadingGrn: grnQuery.isLoading,
    refetchGrn: grnQuery.refetch,
    createPurchaseRequest,
    submitPurchaseRequest,
    approvePurchaseRequest,
    rejectPurchaseRequest,
    convertPrToPo,
    createPurchaseOrder,
    cancelPurchaseOrder,
    closePurchaseOrder,
    createGoodsReceipt,
    createBillFromGrn,
  };
}
