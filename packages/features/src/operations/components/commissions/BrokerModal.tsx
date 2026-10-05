import { useState } from 'react';
import { Dialog, Button, FormField, Input } from '@exzaestate/ui';
import type { CreateBrokerInput, BrokerItem } from '../../schemas/operations.schema.js';

export interface BrokerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateBrokerInput) => Promise<void>;
  initialData?: BrokerItem | null;
}

function clean(val: string): string | undefined {
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getSubmitText(isSubmitting: boolean, hasData: boolean): string {
  if (isSubmitting) return 'Saving...';
  if (hasData) return 'Update Broker';
  return 'Create Broker';
}

function BrokerBankSection({
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
        <FormField id="broker-bank-name" label="Bank Name">
          <Input
            id="broker-bank-name"
            value={bankName}
            onChange={(e) => onChangeBankName(e.target.value)}
            placeholder="e.g. BRAC Bank PLC"
          />
        </FormField>
        <FormField id="broker-bank-account" label="Account Number">
          <Input
            id="broker-bank-account"
            value={bankAccountNumber}
            onChange={(e) => onChangeAccount(e.target.value)}
            placeholder="150xxxxxxxx"
          />
        </FormField>
      </div>
    </div>
  );
}

function initBrokerForm(d?: BrokerItem | null) {
  const defaults = {
    name: '',
    phone: '',
    email: '',
    nid: '',
    tin: '',
    bankName: '',
    bankAccountNumber: '',
  };
  return Object.assign(defaults, d);
}

export function BrokerModal({ isOpen, onClose, onSubmit, initialData }: BrokerModalProps) {
  const initial = initBrokerForm(initialData);
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [email, setEmail] = useState(initial.email);
  const [nid, setNid] = useState(initial.nid);
  const [tin, setTin] = useState(initial.tin);
  const [bankName, setBankName] = useState(initial.bankName);
  const [bankAccountNumber, setBankAccountNumber] = useState(initial.bankAccountNumber);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Broker name and phone are required');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim(),
        email: clean(email),
        nid: clean(nid),
        tin: clean(tin),
        bankName: clean(bankName),
        bankAccountNumber: clean(bankAccountNumber),
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save broker');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Broker Profile' : 'Register New Broker'}
      description="Maintain registered broker agents, commission settlement accounts, and tax profiles."
      size="md"
    >
      {error && (
        <div className="mb-4 rounded-card border border-danger/30 bg-danger/10 p-3 text-caption text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField id="broker-name" label="Full Name" required>
          <Input
            id="broker-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kamal Hossain"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField id="broker-phone" label="Phone Number" required>
            <Input
              id="broker-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="017xxxxxxxx"
            />
          </FormField>
          <FormField id="broker-email" label="Email">
            <Input
              id="broker-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="broker@example.com"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField id="broker-nid" label="NID Number">
            <Input
              id="broker-nid"
              value={nid}
              onChange={(e) => setNid(e.target.value)}
              placeholder="10 or 17 digit NID"
            />
          </FormField>
          <FormField id="broker-tin" label="TIN Number">
            <Input
              id="broker-tin"
              value={tin}
              onChange={(e) => setTin(e.target.value)}
              placeholder="12 digit TIN"
            />
          </FormField>
        </div>

        <BrokerBankSection
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
