import type { ReactElement } from 'react';
import { FormField, Input } from '@exzaestate/ui';
import type { PaymentMethodEnum } from '../../schemas/collection.schema.js';
import type { MethodFieldValues } from './payment-entry.helpers.js';

export interface PaymentMethodFieldsProps {
  method: PaymentMethodEnum;
  fields: MethodFieldValues;
  errors: Record<string, string>;
  onChange: (field: keyof MethodFieldValues, value: string) => void;
}

export function PaymentMethodFields({
  method,
  fields,
  errors,
  onChange,
}: PaymentMethodFieldsProps): ReactElement | null {
  if (method === 'CHEQUE') {
    return (
      <div className="p-4 rounded-card border border-border bg-surface-sunken/40 space-y-3">
        <h4 className="text-small font-semibold text-text">Cheque Information</h4>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="chequeNumber" label="Cheque Number" required error={errors.chequeNumber}>
            <Input
              id="chequeNumber"
              placeholder="e.g. CQ-982314"
              value={fields.chequeNumber}
              onChange={(e) => onChange('chequeNumber', e.target.value)}
            />
          </FormField>
          <FormField id="chequeBank" label="Bank Name" required error={errors.chequeBank}>
            <Input
              id="chequeBank"
              placeholder="e.g. Islami Bank, BRAC Bank"
              value={fields.chequeBank}
              onChange={(e) => onChange('chequeBank', e.target.value)}
            />
          </FormField>
          <FormField id="chequeBranch" label="Branch">
            <Input
              id="chequeBranch"
              placeholder="e.g. Gulshan Branch"
              value={fields.chequeBranch}
              onChange={(e) => onChange('chequeBranch', e.target.value)}
            />
          </FormField>
          <FormField id="chequeDate" label="Cheque Date">
            <Input
              id="chequeDate"
              type="date"
              value={fields.chequeDate}
              onChange={(e) => onChange('chequeDate', e.target.value)}
            />
          </FormField>
        </div>
        <FormField id="chequeDrawer" label="Cheque Drawer / Signatory Name">
          <Input
            id="chequeDrawer"
            placeholder="Name on cheque"
            value={fields.chequeDrawer}
            onChange={(e) => onChange('chequeDrawer', e.target.value)}
          />
        </FormField>
      </div>
    );
  }

  if (method === 'BKASH' || method === 'NAGAD') {
    return (
      <div className="p-4 rounded-card border border-border bg-surface-sunken/40 space-y-3">
        <h4 className="text-small font-semibold text-text">{method} Transaction Reference</h4>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            id="mobileTrxId"
            label="Transaction ID (TrxID)"
            required
            error={errors.mobileTrxId}
          >
            <Input
              id="mobileTrxId"
              placeholder="e.g. 9J28DA10K"
              value={fields.mobileTrxId}
              onChange={(e) => onChange('mobileTrxId', e.target.value)}
            />
          </FormField>
          <FormField id="mobileSenderPhone" label="Sender Mobile Number">
            <Input
              id="mobileSenderPhone"
              placeholder="e.g. 01712345678"
              value={fields.mobileSenderPhone}
              onChange={(e) => onChange('mobileSenderPhone', e.target.value)}
            />
          </FormField>
        </div>
      </div>
    );
  }

  if (method === 'BANK_TRANSFER') {
    return (
      <div className="p-4 rounded-card border border-border bg-surface-sunken/40 space-y-3">
        <h4 className="text-small font-semibold text-text">Bank Transfer Details</h4>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="bankName" label="Receiving Bank Name">
            <Input
              id="bankName"
              placeholder="e.g. City Bank, Prime Bank"
              value={fields.bankName}
              onChange={(e) => onChange('bankName', e.target.value)}
            />
          </FormField>
          <FormField id="bankAccountRef" label="Account Ref / Deposit Slip #">
            <Input
              id="bankAccountRef"
              placeholder="e.g. Slip # 104829"
              value={fields.bankAccountRef}
              onChange={(e) => onChange('bankAccountRef', e.target.value)}
            />
          </FormField>
        </div>
      </div>
    );
  }

  if (method === 'CARD') {
    return (
      <div className="p-4 rounded-card border border-border bg-surface-sunken/40 space-y-3">
        <h4 className="text-small font-semibold text-text">POS Card Slip Details</h4>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="cardSlipRef" label="POS Slip Reference #">
            <Input
              id="cardSlipRef"
              placeholder="e.g. POS-82918"
              value={fields.cardSlipRef}
              onChange={(e) => onChange('cardSlipRef', e.target.value)}
            />
          </FormField>
          <FormField id="cardLast4" label="Card Last 4 Digits">
            <Input
              id="cardLast4"
              placeholder="e.g. 4021"
              maxLength={4}
              value={fields.cardLast4}
              onChange={(e) => onChange('cardLast4', e.target.value)}
            />
          </FormField>
        </div>
      </div>
    );
  }

  return null;
}
