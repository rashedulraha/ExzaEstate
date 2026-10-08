import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ShoppingBag, Plus, Building2 } from 'lucide-react';
import { Button } from '@exzaestate/ui';
import { useProcurement } from '../hooks/useProcurement.js';
import { useVendors } from '../hooks/useVendors.js';
import {
  PurchaseRequestDataTable,
  PurchaseRequestModal,
  PurchaseRequestDetailDrawer,
  ConvertPrToPoModal,
  PurchaseOrderDataTable,
  PurchaseOrderModal,
  PurchaseOrderDetailDrawer,
  GoodsReceiptDataTable,
  GoodsReceiptModal,
  GoodsReceiptDetailDrawer,
} from '../components/procurement/index.js';
import type {
  PurchaseRequestItem,
  PurchaseOrderItem,
  GoodsReceiptItem,
} from '../schemas/procurement.schema.js';

interface ProcurementHeaderActionsProps {
  tab: 'PR' | 'PO' | 'GRN';
  setTab: (tab: 'PR' | 'PO' | 'GRN') => void;
  prCount: number;
  poCount: number;
  grnCount: number;
  onNewPr: () => void;
  onNewPo: () => void;
  onReceiveGoods: () => void;
  onNavigateVendors: () => void;
}

function ProcurementHeaderActions({
  tab,
  setTab,
  prCount,
  poCount,
  grnCount,
  onNewPr,
  onNewPo,
  onReceiveGoods,
  onNavigateVendors,
}: ProcurementHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-button border border-border bg-surface-sunken p-0.5">
        <button
          type="button"
          onClick={() => setTab('PR')}
          className={`rounded-button px-3 py-1.5 text-btn cursor-pointer transition-colors ${
            tab === 'PR' ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'
          }`}
        >
          Requisitions ({prCount})
        </button>
        <button
          type="button"
          onClick={() => setTab('PO')}
          className={`rounded-button px-3 py-1.5 text-btn cursor-pointer transition-colors ${
            tab === 'PO' ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'
          }`}
        >
          Orders ({poCount})
        </button>
        <button
          type="button"
          onClick={() => setTab('GRN')}
          className={`rounded-button px-3 py-1.5 text-btn cursor-pointer transition-colors ${
            tab === 'GRN' ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text'
          }`}
        >
          Goods Receipts ({grnCount})
        </button>
      </div>

      {tab === 'PR' && (
        <Button variant="primary" onClick={onNewPr} leftIcon={<Plus className="h-4 w-4" />}>
          New Request
        </Button>
      )}
      {tab === 'PO' && (
        <Button variant="primary" onClick={onNewPo} leftIcon={<Plus className="h-4 w-4" />}>
          New PO
        </Button>
      )}
      {tab === 'GRN' && (
        <Button variant="primary" onClick={onReceiveGoods} leftIcon={<Plus className="h-4 w-4" />}>
          Receive Goods
        </Button>
      )}

      <Button
        variant="secondary"
        onClick={onNavigateVendors}
        leftIcon={<Building2 className="h-4 w-4" />}
      >
        Vendors & Bills
      </Button>
    </div>
  );
}

export function ProcurementPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'PR' | 'PO' | 'GRN'>('PR');

  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [selectedPr, setSelectedPr] = useState<PurchaseRequestItem | null>(null);
  const [prToConvert, setPrToConvert] = useState<PurchaseRequestItem | null>(null);

  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrderItem | null>(null);

  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState<GoodsReceiptItem | null>(null);
  const [poToReceive, setPoToReceive] = useState<PurchaseOrderItem | null>(null);

  const {
    purchaseRequests,
    isLoadingPr,
    purchaseOrders,
    isLoadingPo,
    goodsReceipts,
    isLoadingGrn,
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
  } = useProcurement();

  const { vendors = [] } = useVendors();

  return (
    <div className="container-page space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <h1 className="text-h1 font-semibold text-text">Procurement & Material Lifecycle</h1>
          </div>
          <p className="mt-1 text-caption text-text-muted">
            End-to-end requisition: Purchase Request (PR) → Purchase Order (PO) → Goods Receipt
            (GRN) → 3-Way Match
          </p>
        </div>

        <ProcurementHeaderActions
          tab={tab}
          setTab={setTab}
          prCount={purchaseRequests.length}
          poCount={purchaseOrders.length}
          grnCount={goodsReceipts.length}
          onNewPr={() => setIsPrModalOpen(true)}
          onNewPo={() => setIsPoModalOpen(true)}
          onReceiveGoods={() => {
            setPoToReceive(null);
            setIsGrnModalOpen(true);
          }}
          onNavigateVendors={() => navigate('/operations/vendors')}
        />
      </div>

      {tab === 'PR' && (
        <PurchaseRequestDataTable
          requests={purchaseRequests}
          isLoading={isLoadingPr}
          onSelectRequest={setSelectedPr}
          onSubmitRequest={(pr) => submitPurchaseRequest(pr.id)}
          onConvertToPo={setPrToConvert}
          onOpenCreateModal={() => setIsPrModalOpen(true)}
        />
      )}

      {tab === 'PO' && (
        <PurchaseOrderDataTable
          orders={purchaseOrders}
          isLoading={isLoadingPo}
          onSelectOrder={setSelectedPo}
          onCreateGrn={(po) => {
            setPoToReceive(po);
            setIsGrnModalOpen(true);
          }}
          onOpenCreateModal={() => setIsPoModalOpen(true)}
        />
      )}

      {tab === 'GRN' && (
        <GoodsReceiptDataTable
          receipts={goodsReceipts}
          isLoading={isLoadingGrn}
          onSelectReceipt={setSelectedGrn}
          onCreateBill={(grn) => createBillFromGrn(grn.id)}
          onOpenCreateModal={() => {
            setPoToReceive(null);
            setIsGrnModalOpen(true);
          }}
        />
      )}

      <PurchaseRequestModal
        isOpen={isPrModalOpen}
        onClose={() => setIsPrModalOpen(false)}
        onSubmit={createPurchaseRequest}
      />

      <PurchaseRequestDetailDrawer
        isOpen={Boolean(selectedPr)}
        onClose={() => setSelectedPr(null)}
        pr={selectedPr}
        onSubmitPr={submitPurchaseRequest}
        onApprovePr={approvePurchaseRequest}
        onRejectPr={rejectPurchaseRequest}
        onOpenConvertToPo={(pr) => {
          setSelectedPr(null);
          setPrToConvert(pr);
        }}
      />

      <ConvertPrToPoModal
        isOpen={Boolean(prToConvert)}
        onClose={() => setPrToConvert(null)}
        pr={prToConvert}
        vendors={vendors}
        onSubmit={convertPrToPo}
      />

      <PurchaseOrderModal
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        onSubmit={createPurchaseOrder}
        vendors={vendors}
      />

      <PurchaseOrderDetailDrawer
        isOpen={Boolean(selectedPo)}
        onClose={() => setSelectedPo(null)}
        po={selectedPo}
        onCreateGrn={(po) => {
          setSelectedPo(null);
          setPoToReceive(po);
          setIsGrnModalOpen(true);
        }}
        onCancelPo={cancelPurchaseOrder}
        onClosePo={closePurchaseOrder}
      />

      <GoodsReceiptModal
        isOpen={isGrnModalOpen}
        onClose={() => {
          setIsGrnModalOpen(false);
          setPoToReceive(null);
        }}
        onSubmit={createGoodsReceipt}
        purchaseOrders={purchaseOrders}
        preselectedPoId={poToReceive?.id}
      />

      <GoodsReceiptDetailDrawer
        isOpen={Boolean(selectedGrn)}
        onClose={() => setSelectedGrn(null)}
        grn={selectedGrn}
        onCreateBill={createBillFromGrn}
      />
    </div>
  );
}
