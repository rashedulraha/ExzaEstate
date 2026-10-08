import { useState } from 'react';
import { Dialog, Button, FormField, Input, Select } from '@exzaestate/ui';
import type { VendorItem } from '../../schemas/operations.schema.js';
import type {
  PurchaseRequestItem,
  ConvertPrToPoFormInput,
} from '../../schemas/procurement.schema.js';

export interface ConvertPrToPoModalProps {
  isOpen: boolean;
  onClose: () => void;
  pr: PurchaseRequestItem | null;
  vendors: VendorItem[];
  onSubmit: (prId: string, input: ConvertPrToPoFormInput) => Promise<void>;
}

export function ConvertPrToPoModal({
  isOpen,
  onClose,
  pr,
  vendors,
  onSubmit,
}: ConvertPrToPoModalProps) {
  const [vendorId, setVendorId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState(
    'Payment upon 100% inspection and verification of materials at site.',
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !pr) return null;

  const vendorOptions = [
    { label: 'Select a vendor...', value: '' },
    ...vendors.map((v) => ({ label: `${v.name}${v.phone ? ` (${v.phone})` : ''}`, value: v.id })),
  ];

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!vendorId) return setError('Please select a supplier/vendor');
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(pr.id, {
        vendorId,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        termsAndConditions: termsAndConditions.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to convert PR to PO');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Convert ${pr.prNumber} to Purchase Order`}
      description="Issue a Purchase Order to an approved supplier based on this approved requisition."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-card border border-danger/30 bg-danger/10 p-3 text-caption text-danger">
            {error}
          </div>
        )}
        <FormField id="convert-vendor" label="Supplier / Vendor" required>
          <Select
            id="convert-vendor"
            value={vendorId}
            onChange={(val) => setVendorId(val)}
            options={vendorOptions}
          />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="convert-delivery-date" label="Expected Delivery Date">
            <Input
              id="convert-delivery-date"
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            />
          </FormField>
          <FormField id="convert-delivery-address" label="Delivery Site / Address">
            <Input
              id="convert-delivery-address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="e.g. Project Site A, Gulshan-2, Dhaka"
            />
          </FormField>
        </div>
        <FormField id="convert-terms" label="Terms & Conditions">
          <Input
            id="convert-terms"
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
            placeholder="Standard purchase terms"
          />
        </FormField>
        <FormField id="convert-notes" label="Order Notes">
          <Input
            id="convert-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal order remarks"
          />
        </FormField>
        <div className="flex justify-end gap-3 pt-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Generate Purchase Order
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
