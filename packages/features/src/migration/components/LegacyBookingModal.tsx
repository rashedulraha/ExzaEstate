import { useState } from 'react';
import { Dialog, Button, FormField, Input } from '@exzaestate/ui';
import type { LegacyBookingFormData } from '../schemas/migration.schema.js';

export interface LegacyBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LegacyBookingFormData) => Promise<unknown>;
  isSubmitting: boolean;
}

export function LegacyBookingModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: LegacyBookingModalProps) {
  const [customerId, setCustomerId] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [legacyNo, setLegacyNo] = useState('');
  const [bookingDate, setBookingDate] = useState('2025-06-01');
  const [netPriceBdt, setNetPriceBdt] = useState('5000000');
  const [paidBdt, setPaidBdt] = useState('2000000');
  const [oldReceiptNo, setOldReceiptNo] = useState('OLD-REC-001');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const netPaisa = Math.round(parseFloat(netPriceBdt) * 100).toString();
    const paidPaisa = Math.round(parseFloat(paidBdt) * 100).toString();

    await onSubmit({
      customerId: customerId.trim(),
      propertyId: propertyId.trim() || undefined,
      legacyBookingNo: legacyNo.trim(),
      bookingDate,
      netPricePaisa: netPaisa,
      totalPaidPaisa: paidPaisa,
      historicalPayments: [
        {
          date: bookingDate,
          amountPaisa: paidPaisa,
          method: 'CHEQUE',
          receiptNumber: oldReceiptNo.trim(),
        },
      ],
      remainingInstallments: [],
    });
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add Legacy Booking Record"
      description="Enter historical sales agreement details for go-live AR reconciliation."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            label="Customer Identifier"
            id="legacy-customer-id"
            helperText="Customer code or ID"
          >
            <Input
              id="legacy-customer-id"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="e.g. CUST-001"
              required
            />
          </FormField>

          <FormField label="Property Unit Reference" id="legacy-property-id">
            <Input
              id="legacy-property-id"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              placeholder="e.g. FLAT-4A or unit ID"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Legacy Agreement No" id="legacy-no">
            <Input
              id="legacy-no"
              value={legacyNo}
              onChange={(e) => setLegacyNo(e.target.value)}
              placeholder="e.g. LEGACY-BKG-101"
              required
            />
          </FormField>

          <FormField label="Original Booking Date" id="legacy-date">
            <Input
              id="legacy-date"
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              required
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Net Agreed Price (BDT)" id="legacy-net-price">
            <Input
              id="legacy-net-price"
              type="number"
              min={1}
              value={netPriceBdt}
              onChange={(e) => setNetPriceBdt(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Total Paid So Far (BDT)" id="legacy-paid">
            <Input
              id="legacy-paid"
              type="number"
              min={0}
              value={paidBdt}
              onChange={(e) => setPaidBdt(e.target.value)}
              required
            />
          </FormField>
        </div>

        <FormField label="Historical Receipt Reference" id="legacy-receipt-no">
          <Input
            id="legacy-receipt-no"
            value={oldReceiptNo}
            onChange={(e) => setOldReceiptNo(e.target.value)}
            placeholder="e.g. OLD-REC-4821"
            required
          />
        </FormField>

        <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border">
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            Add Legacy Booking
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
