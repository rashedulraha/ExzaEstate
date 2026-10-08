import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { formatMoney } from '@exzaestate/shared';
import * as appCore from '@exzaestate/app-core';
import { PurchaseRequestDataTable } from './components/procurement/PurchaseRequestDataTable.js';
import { PurchaseOrderDataTable } from './components/procurement/PurchaseOrderDataTable.js';
import { GoodsReceiptDataTable } from './components/procurement/GoodsReceiptDataTable.js';
import type {
  PurchaseRequestItem,
  PurchaseOrderItem,
  GoodsReceiptItem,
} from './schemas/procurement.schema.js';

const mockUsePermission = vi.fn();

vi.mock('@exzaestate/app-core', async () => {
  const actual = await vi.importActual<typeof appCore>('@exzaestate/app-core');
  return {
    ...actual,
    usePermission: (perm: string, scope?: unknown) => mockUsePermission(perm, scope),
  };
});

const testPrs: PurchaseRequestItem[] = [
  {
    id: 'pr-001',
    prNumber: 'PR-2026-0001',
    title: '500 Bags OPC Cement for Tower 1',
    department: 'Civil Construction',
    requestedById: 'user-001',
    requestedByName: 'Engr. Rahim',
    requiredDate: '2026-10-15',
    priority: 'HIGH',
    status: 'DRAFT',
    totalEstimatedPaisa: '25000000',
    createdAt: '2026-10-08T00:00:00.000Z',
    lines: [
      {
        id: 'pr-line-001',
        itemDescription: 'OPC Cement 50kg bag',
        category: 'RAW_MATERIALS',
        quantity: '500',
        unit: 'BAGS',
        estimatedUnitPricePaisa: '50000',
        estimatedAmountPaisa: '25000000',
      },
    ],
  },
  {
    id: 'pr-002',
    prNumber: 'PR-2026-0002',
    title: '10 Tons Deformed Steel Rods 16mm',
    department: 'Structural Engineering',
    requestedById: 'user-002',
    priority: 'URGENT',
    status: 'APPROVED',
    totalEstimatedPaisa: '95000000',
    createdAt: '2026-10-08T00:00:00.000Z',
    lines: [],
  },
];

const testPos: PurchaseOrderItem[] = [
  {
    id: 'po-001',
    poNumber: 'PO-2026-0001',
    prId: 'pr-002',
    vendorId: 'vnd-001',
    vendor: {
      id: 'vnd-001',
      name: 'BSRM Steels Ltd',
      vendorNumber: 'VND-001',
      phone: '+8801700000000',
    },
    orderDate: '2026-10-08',
    status: 'ORDERED',
    totalAmountPaisa: '95000000',
    receivedAmountPaisa: '0',
    billedAmountPaisa: '0',
    createdAt: '2026-10-08T00:00:00.000Z',
    lines: [
      {
        id: 'po-line-001',
        itemDescription: 'Deformed Bar 16mm 500W',
        category: 'RAW_MATERIALS',
        quantity: '10',
        receivedQuantity: '0',
        billedQuantity: '0',
        unit: 'TONS',
        unitPricePaisa: '9500000',
        totalAmountPaisa: '95000000',
      },
    ],
  },
];

const testGrns: GoodsReceiptItem[] = [
  {
    id: 'grn-001',
    grnNumber: 'GRN-2026-0001',
    poId: 'po-001',
    purchaseOrder: {
      id: 'po-001',
      poNumber: 'PO-2026-0001',
      status: 'ORDERED',
    },
    vendorId: 'vnd-001',
    vendor: {
      id: 'vnd-001',
      name: 'BSRM Steels Ltd',
      vendorNumber: 'VND-001',
    },
    receiptDate: '2026-10-09',
    challanNumber: 'CH-BSRM-8821',
    status: 'RECEIVED',
    receivedById: 'user-001',
    totalAmountPaisa: '95000000',
    createdAt: '2026-10-09T00:00:00.000Z',
    lines: [
      {
        id: 'grn-line-001',
        itemDescription: 'Deformed Bar 16mm 500W',
        receivedQuantity: '10',
        acceptedQuantity: '10',
        rejectedQuantity: '0',
        unit: 'TONS',
        unitPricePaisa: '9500000',
        totalAmountPaisa: '95000000',
      },
    ],
  },
];

describe('Procurement Module (P2.2) - PR → PO → GRN Lifecycle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUsePermission.mockReturnValue({
      hasPermission: true,
      scope: 'ALL',
    });
  });

  it('renders PurchaseRequestDataTable with requisition numbers and BDT formatting', () => {
    const onSelect = vi.fn();
    const onSubmit = vi.fn();
    const onConvert = vi.fn();

    render(
      <MemoryRouter>
        <PurchaseRequestDataTable
          requests={testPrs}
          onSelectRequest={onSelect}
          onSubmitRequest={onSubmit}
          onConvertToPo={onConvert}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('PR-2026-0001')).toBeDefined();
    expect(screen.getByText('500 Bags OPC Cement for Tower 1')).toBeDefined();
    expect(screen.getByText('Civil Construction')).toBeDefined();
    expect(screen.getByText('HIGH')).toBeDefined();
    expect(screen.getByText('DRAFT')).toBeDefined();
    expect(screen.getByText(formatMoney(BigInt('25000000')))).toBeDefined();

    // PR-2026-0002 has status APPROVED and convert action
    expect(screen.getByText('PR-2026-0002')).toBeDefined();
    expect(screen.getByText('APPROVED')).toBeDefined();

    // Trigger row select
    const viewButtons = screen.getAllByTitle('View PR Details');
    expect(viewButtons.length).toBe(2);
    if (viewButtons[0]) {
      fireEvent.click(viewButtons[0]);
      expect(onSelect).toHaveBeenCalledWith(testPrs[0]);
    }

    // Trigger submit on draft
    const submitBtn = screen.getByTitle('Submit for Approval');
    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledWith(testPrs[0]);

    // Trigger convert on approved
    const convertBtn = screen.getByTitle('Convert to Purchase Order');
    fireEvent.click(convertBtn);
    expect(onConvert).toHaveBeenCalledWith(testPrs[1]);
  });

  it('renders PurchaseOrderDataTable with supplier details and receipt actions', () => {
    const onSelect = vi.fn();
    const onCreateGrn = vi.fn();

    render(
      <MemoryRouter>
        <PurchaseOrderDataTable
          orders={testPos}
          onSelectOrder={onSelect}
          onCreateGrn={onCreateGrn}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('PO-2026-0001')).toBeDefined();
    expect(screen.getByText('BSRM Steels Ltd')).toBeDefined();
    expect(screen.getByText('ORDERED')).toBeDefined();
    expect(screen.getByText(formatMoney(BigInt('95000000')))).toBeDefined();

    const grnBtn = screen.getByTitle('Receive Goods (GRN)');
    fireEvent.click(grnBtn);
    expect(onCreateGrn).toHaveBeenCalledWith(testPos[0]);
  });

  it('renders GoodsReceiptDataTable and triggers 3-Way matching bill action', () => {
    const onSelect = vi.fn();
    const onCreateBill = vi.fn();

    render(
      <MemoryRouter>
        <GoodsReceiptDataTable
          receipts={testGrns}
          onSelectReceipt={onSelect}
          onCreateBill={onCreateBill}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('GRN-2026-0001')).toBeDefined();
    expect(screen.getByText('PO-2026-0001')).toBeDefined();
    expect(screen.getByText('Challan: CH-BSRM-8821')).toBeDefined();
    expect(screen.getByText('RECEIVED')).toBeDefined();
    expect(screen.getByText(formatMoney(BigInt('95000000')))).toBeDefined();

    const matchBtn = screen.getByTitle('Generate Vendor Bill (3-Way Match)');
    fireEvent.click(matchBtn);
    expect(onCreateBill).toHaveBeenCalledWith(testGrns[0]);
  });
});
