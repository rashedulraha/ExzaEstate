import { useState } from 'react';
import { Dialog, Button, FormField, Input } from '@exzaestate/ui';
import type { CreateVendorInput, VendorItem } from '../../schemas/operations.schema.js';

export interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateVendorInput) => Promise<void>;
  initialData?: VendorItem | null;
}

function clean(val: string): string | undefined {
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getSubmitText(isSubmitting: boolean, hasData: boolean): string {
  if (isSubmitting) return 'Saving...';
  if (hasData) return 'Update Vendor';
  return 'Create Vendor';
}

function VendorTaxSection({
  tin,
  bin,
  onChangeTin,
  onChangeBin,
}: {
  tin: string;
  bin: string;
  onChangeTin: (v: string) => void;
  onChangeBin: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <FormField id="vendor-tin" label="TIN (e-TIN)">
        <Input
          id="vendor-tin"
          value={tin}
          onChange={(e) => onChangeTin(e.target.value)}
          placeholder="12-digit TIN"
        />
      </FormField>
      <FormField id="vendor-bin" label="BIN / VAT Reg No">
        <Input
          id="vendor-bin"
          value={bin}
          onChange={(e) => onChangeBin(e.target.value)}
          placeholder="9-digit or 13-digit BIN"
        />
      </FormField>
    </div>
  );
}

function VendorBankSection({
  bankName,
  bankAccountNumber,
  onChangeBankName,
  onChangeAccount,
}: {
  bankName: string;
  bankAccountNumber: string;
  onChangeBankName: (v: string) => void;
  onChangeAccount: (v: string) => void;
}) {
  return (
    <div className="rounded-card border border-border bg-surface-sunken/40 p-3">
      <h3 className="mb-2 text-th">Bank Disbursement Info</h3>
      <div className="grid grid-cols-2 gap-3">
        <FormField id="vendor-bank-name" label="Bank Name">
          <Input
            id="vendor-bank-name"
            value={bankName}
            onChange={(e) => onChangeBankName(e.target.value)}
            placeholder="e.g. City Bank PLC"
          />
        </FormField>
        <FormField id="vendor-bank-account" label="Account Number">
          <Input
            id="vendor-bank-account"
            value={bankAccountNumber}
            onChange={(e) => onChangeAccount(e.target.value)}
            placeholder="110xxxxxxxx"
          />
        </FormField>
      </div>
    </div>
  );
}

function initVendorForm(d?: VendorItem | null) {
  const defaults = {
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    tradeLicenseNo: '',
    tin: '',
    bin: '',
    bankName: '',
    bankAccountNumber: '',
  };
  return Object.assign(defaults, d);
}

export function VendorModal({ isOpen, onClose, onSubmit, initialData }: VendorModalProps) {
  const initial = initVendorForm(initialData);
  const [name, setName] = useState(initial.name);
  const [contactPerson, setContactPerson] = useState(initial.contactPerson);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [address, setAddress] = useState(initial.address);
  const [tradeLicenseNo, setTradeLicenseNo] = useState(initial.tradeLicenseNo);
  const [tin, setTin] = useState(initial.tin);
  const [bin, setBin] = useState(initial.bin);
  const [bankName, setBankName] = useState(initial.bankName);
  const [bankAccountNumber, setBankAccountNumber] = useState(initial.bankAccountNumber);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setError('Vendor name is required');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        contactPerson: clean(contactPerson),
        phone: clean(phone),
        email: clean(email),
        address: clean(address),
        tradeLicenseNo: clean(tradeLicenseNo),
        tin: clean(tin),
        bin: clean(bin),
        bankName: clean(bankName),
        bankAccountNumber: clean(bankAccountNumber),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save vendor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Vendor / Supplier' : 'Register New Vendor'}
      description="Register vendor company profile, TIN/BIN withholding credentials, and disbursement bank."
      size="md"
    >
      {error && (
        <div className="mb-4 rounded-card border border-danger/30 bg-danger/10 p-3 text-caption text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField id="vendor-name" label="Vendor Name" required>
          <Input
            id="vendor-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Meghna Cement Mills Ltd."
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField id="vendor-contact" label="Contact Person">
            <Input
              id="vendor-contact"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="e.g. Md. Rafiqul Islam"
            />
          </FormField>
          <FormField id="vendor-phone" label="Phone">
            <Input
              id="vendor-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="017xxxxxxxx"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField id="vendor-email" label="Email">
            <Input
              id="vendor-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vendor@example.com"
            />
          </FormField>
          <FormField id="vendor-trade-license" label="Trade License No">
            <Input
              id="vendor-trade-license"
              value={tradeLicenseNo}
              onChange={(e) => setTradeLicenseNo(e.target.value)}
              placeholder="TRAD/DNCC/123456"
            />
          </FormField>
        </div>

        <VendorTaxSection tin={tin} bin={bin} onChangeTin={setTin} onChangeBin={setBin} />

        <FormField id="vendor-address" label="Address">
          <Input
            id="vendor-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Registered business address..."
          />
        </FormField>

        <VendorBankSection
          bankName={bankName}
          bankAccountNumber={bankAccountNumber}
          onChangeBankName={setBankName}
          onChangeAccount={setBankAccountNumber}
        />

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              handleSubmit(e);
            }}
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            {getSubmitText(isSubmitting, Boolean(initialData))}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
