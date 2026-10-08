import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { formatMoney } from '@exzaestate/shared';
import * as appCore from '@exzaestate/app-core';
import { VendorDataTable } from './components/vendors/VendorDataTable.js';
import { VendorModal } from './components/vendors/VendorModal.js';
import { VendorBillModal } from './components/vendors/VendorBillModal.js';
import { VendorBillDrawer } from './components/vendors/VendorBillDrawer.js';
import { VendorPaymentModal } from './components/vendors/VendorPaymentModal.js';
import { testVendors, testVendorBills } from './operations.test-fixtures.js';

const mockUsePermission = vi.fn();

vi.mock('@exzaestate/app-core', async () => {
  const actual = await vi.importActual<typeof appCore>('@exzaestate/app-core');
  return {
    ...actual,
    usePermission: (perm: string, scope?: unknown) => mockUsePermission(perm, scope),
  };
});

describe('Operations Module (B6) - S2: Vendors, Bills & Accounts Payable (AP)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUsePermission.mockReturnValue({
      hasPermission: true,
      scope: 'ALL',
    });
  });

  it('renders VendorDataTable with outstanding balance and contact information', () => {
    const onSelect = vi.fn();
    const onCreateBill = vi.fn();
    const onPay = vi.fn();

    render(
      <VendorDataTable
        vendors={testVendors}
        onSelectVendor={onSelect}
        onCreateBill={onCreateBill}
        onPayVendor={onPay}
      />,
    );

    // Verify vendor details
    expect(screen.getByText('Meghna Cement Mills Ltd.')).toBeDefined();
    expect(screen.getByText('Attn: Md. Rafiqul Islam')).toBeDefined();
    expect(screen.getByText('01711223344')).toBeDefined();

    // Verify outstanding balance formatted in BDT
    expect(screen.getByText(formatMoney(BigInt('150000000')))).toBeDefined();

    // Verify status
    expect(screen.getAllByText('ACTIVE').length).toBe(2);

    // Trigger action buttons
    const billButtons = screen.getAllByTitle('Create Bill');
    if (billButtons[0]) {
      fireEvent.click(billButtons[0]);
      expect(onCreateBill).toHaveBeenCalledWith(testVendors[0]);
    }
  });

  it('submits VendorModal with valid supplier registration fields', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(<VendorModal isOpen={true} onClose={onClose} onSubmit={onSubmit} />);

    expect(screen.getByText('Register New Vendor')).toBeDefined();

    // Fill required and optional fields
    fireEvent.change(screen.getByPlaceholderText('e.g. Meghna Cement Mills Ltd.'), {
      target: { value: 'Shah Cement Industries' },
    });
    fireEvent.change(screen.getByPlaceholderText('017xxxxxxxx'), {
      target: { value: '01700112233' },
    });
    fireEvent.change(screen.getByPlaceholderText('12-digit TIN'), {
      target: { value: '998877665544' },
    });

    const submitBtn = screen.getByText('Create Vendor');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Shah Cement Industries',
          phone: '01700112233',
          tin: '998877665544',
        }),
      );
    });
  });

  it('calculates TDS/VDS withholdings and net payable correctly in VendorBillModal', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <VendorBillModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
        vendors={testVendors}
        preselectedVendorId="vnd-1"
      />,
    );

    expect(screen.getByText('Create Vendor Bill / Invoice')).toBeDefined();

    // Fill line item
    const descInput = screen.getByPlaceholderText('Item description');
    const amountInput = screen.getByPlaceholderText('Amount (BDT)');

    fireEvent.change(descInput, { target: { value: '500 Bags OPC Cement' } });
    fireEvent.change(amountInput, { target: { value: '500000' } }); // BDT 5,00,000

    // Fill TDS and VDS withholdings
    const tdsInputs = screen.getAllByDisplayValue('0');
    const tdsInput = tdsInputs[0];
    if (tdsInput) {
      fireEvent.change(tdsInput, { target: { value: '25000' } }); // BDT 25,00,000 TDS
    }

    // Verify net payable update: BDT 5,00,000 - BDT 25,000 = BDT 4,75,000
    expect(screen.getByText(/Net Payable:\s*BDT\s*4,75,000/)).toBeDefined();

    const saveBtn = screen.getByText('Save Vendor Bill');
    fireEvent.submit(saveBtn.closest('form')!);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          vendorId: 'vnd-1',
          taxWithholdingPaisa: '2500000',
        }),
      );
    });
  });

  it('renders VendorBillDrawer and triggers Post to AP action', async () => {
    const onPost = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <VendorBillDrawer
        isOpen={true}
        onClose={onClose}
        bill={testVendorBills[0] ?? null}
        onPostToAp={onPost}
      />,
    );

    expect(screen.getByText('BILL-2026-001')).toBeDefined();
    expect(screen.getByText('1000 Bags Portland Composite Cement')).toBeDefined();
    expect(screen.getByText('Post to Accounts Payable (AP)')).toBeDefined();

    const postBtn = screen.getByText('Post to Accounts Payable (AP)');
    fireEvent.click(postBtn);

    await waitFor(() => {
      expect(onPost).toHaveBeenCalledWith('bill-1');
    });
  });

  it('renders VendorPaymentModal and records AP disbursement', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <VendorPaymentModal
        isOpen={true}
        onClose={onClose}
        onSubmit={onSubmit}
        vendor={testVendors[0] ?? null}
      />,
    );

    expect(screen.getByText('Disburse AP Payment')).toBeDefined();
    expect(screen.getByText('Meghna Cement Mills Ltd.')).toBeDefined();

    // Fill amount
    const amountInput = screen.getByPlaceholderText('e.g. 250000');
    fireEvent.change(amountInput, { target: { value: '1500000' } }); // ৳15,00,000

    const submitBtn = screen.getByText('Disburse AP Settlement');
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          vendorId: 'vnd-1',
          amountPaisa: '150000000',
        }),
      );
    });
  });
});
