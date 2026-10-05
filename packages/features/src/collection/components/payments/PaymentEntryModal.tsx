import { useState, useMemo } from 'react';
import { formatMoney, getTodayBusinessDate, PERMISSIONS } from '@exzaestate/shared';
import { usePermission } from '@exzaestate/app-core';
import { Dialog, Button, FormField, Input, Select } from '@exzaestate/ui';
import {
  PAYMENT_METHODS,
  type PaymentMethodEnum,
  type PaymentEntryInput,
  type InstallmentScheduleItem,
} from '../../schemas/collection.schema.js';
import {
  type MethodFieldValues,
  calculateAmountPaisa,
  computeAllocationPreview,
  validatePaymentEntry,
  buildPaymentPayload,
} from './payment-entry.helpers.js';
import { PaymentMethodFields } from './PaymentMethodFields.js';

export interface PaymentEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  customerId?: string;
  customerName?: string;
  bookingCode?: string;
  dueAmountPaisa?: string;
  installments?: InstallmentScheduleItem[];
  onSubmitDraft: (data: PaymentEntryInput) => Promise<void>;
  onSubmitPost?: (data: PaymentEntryInput) => Promise<void>;
}

function AllocationPreviewCard({
  preview,
}: {
  preview: { appliedToReceivablesPaisa: string; advancePaisa: string };
}) {
  const hasAdvance = BigInt(preview.advancePaisa) > 0n;
  return (
    <div
      className="p-3 rounded-card bg-surface-sunken border border-border space-y-1.5"
      data-testid="allocation-preview"
    >
      <span className="text-caption font-semibold text-text uppercase tracking-wider">
        Automated Waterfall Allocation Preview
      </span>
      <div className="flex items-center justify-between text-small">
        <span className="text-text-muted">Applied to Receivables:</span>
        <span className="font-semibold text-text tabular-nums">
          {formatMoney(preview.appliedToReceivablesPaisa)}
        </span>
      </div>
      {hasAdvance && (
        <div className="flex items-center justify-between text-small text-accent-text">
          <span>Customer Advance / Credit:</span>
          <span className="font-semibold tabular-nums">+{formatMoney(preview.advancePaisa)}</span>
        </div>
      )}
    </div>
  );
}

interface PaymentModalFooterProps {
  canPost: boolean;
  hasPostHandler: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSaveDraft: () => void;
  onPostPayment: () => void;
}

function PaymentModalFooter({
  canPost,
  hasPostHandler,
  isSubmitting,
  onClose,
  onSaveDraft,
  onPostPayment,
}: PaymentModalFooterProps) {
  const showPostBtn = canPost && hasPostHandler;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-end gap-3 w-full">
        <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="secondary"
          onClick={onSaveDraft}
          isLoading={isSubmitting}
          disabled={isSubmitting}
          data-testid="save-draft-btn"
        >
          Save as Draft
        </Button>
        {showPostBtn && (
          <Button
            variant="primary"
            onClick={onPostPayment}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            data-testid="post-payment-btn"
          >
            Post Payment
          </Button>
        )}
      </div>
      {!canPost && (
        <p className="text-caption text-text-muted text-right">
          Only Finance / Accountants may post payments.
        </p>
      )}
    </div>
  );
}

const INITIAL_FIELDS: MethodFieldValues = {
  chequeNumber: '',
  chequeBank: '',
  chequeBranch: '',
  chequeDate: '',
  chequeDrawer: '',
  mobileTrxId: '',
  mobileSenderPhone: '',
  bankName: '',
  bankAccountRef: '',
  cardLast4: '',
  cardSlipRef: '',
};

export function PaymentEntryModal({
  isOpen,
  onClose,
  bookingId = '',
  customerId = '',
  customerName = '',
  bookingCode = '',
  dueAmountPaisa = '0',
  onSubmitDraft,
  onSubmitPost,
}: PaymentEntryModalProps) {
  const { hasPermission: canPost } = usePermission(PERMISSIONS.PAYMENT_POST);

  const [amountTaka, setAmountTaka] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayBusinessDate());
  const [method, setMethod] = useState<PaymentMethodEnum>('CASH');
  const [referenceNotes, setReferenceNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [methodFields, setMethodFields] = useState<MethodFieldValues>(INITIAL_FIELDS);

  const handleFieldChange = (field: keyof MethodFieldValues, val: string) => {
    setMethodFields((prev) => ({ ...prev, [field]: val }));
  };

  const amountPaisa = useMemo(() => calculateAmountPaisa(amountTaka), [amountTaka]);
  const allocationPreview = useMemo(
    () => computeAllocationPreview(amountPaisa, dueAmountPaisa),
    [amountPaisa, dueAmountPaisa],
  );

  const submitWithAction = async (action: 'DRAFT' | 'POST') => {
    const nextErrors = validatePaymentEntry(amountPaisa, paymentDate, method, methodFields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setIsSubmitting(true);
      const payload = buildPaymentPayload({
        bookingId,
        customerId,
        amountPaisa,
        paymentDate,
        method,
        referenceNotes,
        fields: methodFields,
        actionType: action,
      });
      if (action === 'POST' && onSubmitPost) {
        await onSubmitPost(payload);
      } else {
        await onSubmitDraft(payload);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const descCustomer = customerName ? customerName : 'Customer';
  const descBooking = bookingCode ? ` · ${bookingCode}` : '';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Record Collection Payment"
      description={`Record payment for ${descCustomer}${descBooking}`}
      size="lg"
      footer={
        <PaymentModalFooter
          canPost={canPost}
          hasPostHandler={Boolean(onSubmitPost)}
          isSubmitting={isSubmitting}
          onClose={onClose}
          onSaveDraft={() => submitWithAction('DRAFT')}
          onPostPayment={() => submitWithAction('POST')}
        />
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField id="amountTaka" label="Amount (BDT ৳)" required error={errors.amount}>
            <Input
              id="amountTaka"
              placeholder="e.g. 5,00,000"
              value={amountTaka}
              onChange={(e) => setAmountTaka(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>

          <FormField id="paymentDate" label="Payment Date" required error={errors.paymentDate}>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        <FormField id="paymentMethod" label="Payment Method" required>
          <Select
            id="paymentMethod"
            value={method}
            options={PAYMENT_METHODS.map((m) => ({
              value: m,
              label: m.replace(/_/g, ' '),
            }))}
            onChange={(val) => setMethod(val as PaymentMethodEnum)}
            disabled={isSubmitting}
          />
        </FormField>

        <PaymentMethodFields
          method={method}
          fields={methodFields}
          errors={errors}
          onChange={handleFieldChange}
        />

        <FormField id="referenceNotes" label="Notes / Reference">
          <Input
            id="referenceNotes"
            placeholder="Optional collector remarks or invoice references"
            value={referenceNotes}
            onChange={(e) => setReferenceNotes(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        {allocationPreview && <AllocationPreviewCard preview={allocationPreview} />}
      </div>
    </Dialog>
  );
}
