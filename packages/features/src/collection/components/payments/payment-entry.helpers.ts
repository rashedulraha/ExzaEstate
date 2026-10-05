import type { PaymentMethodEnum, PaymentEntryInput } from '../../schemas/collection.schema.js';

export interface MethodFieldValues {
  chequeNumber: string;
  chequeBank: string;
  chequeBranch: string;
  chequeDate: string;
  chequeDrawer: string;
  mobileTrxId: string;
  mobileSenderPhone: string;
  bankName: string;
  bankAccountRef: string;
  cardLast4: string;
  cardSlipRef: string;
}

export function calculateAmountPaisa(amountTaka: string): string {
  const clean = amountTaka.replace(/[^\d.]/g, '');
  if (!clean) return '0';
  const num = Number(clean);
  if (isNaN(num) || num <= 0) return '0';
  return BigInt(Math.round(num * 100)).toString();
}

export function computeAllocationPreview(
  amountPaisa: string,
  dueAmountPaisa: string,
): { appliedToReceivablesPaisa: string; advancePaisa: string } | null {
  const entered = BigInt(amountPaisa || '0');
  const due = BigInt(dueAmountPaisa || '0');

  if (entered <= 0n) return null;

  if (entered <= due) {
    return {
      appliedToReceivablesPaisa: entered.toString(),
      advancePaisa: '0',
    };
  }

  return {
    appliedToReceivablesPaisa: due.toString(),
    advancePaisa: (entered - due).toString(),
  };
}

export function validatePaymentEntry(
  amountPaisa: string,
  paymentDate: string,
  method: PaymentMethodEnum,
  fields: MethodFieldValues,
): Record<string, string> {
  const nextErrors: Record<string, string> = {};

  if (!amountPaisa || BigInt(amountPaisa) <= 0n) {
    nextErrors.amount = 'Please enter a valid amount greater than zero';
  }
  if (!paymentDate) {
    nextErrors.paymentDate = 'Payment date is required';
  }

  if (method === 'CHEQUE') {
    if (!fields.chequeNumber.trim()) nextErrors.chequeNumber = 'Cheque number is required';
    if (!fields.chequeBank.trim()) nextErrors.chequeBank = 'Bank name is required';
  }

  if (method === 'BKASH' || method === 'NAGAD') {
    if (!fields.mobileTrxId.trim()) nextErrors.mobileTrxId = 'Transaction ID is required';
  }

  return nextErrors;
}

export interface BuildPayloadParams {
  bookingId: string;
  customerId: string;
  amountPaisa: string;
  paymentDate: string;
  method: PaymentMethodEnum;
  referenceNotes: string;
  fields: MethodFieldValues;
  actionType?: 'DRAFT' | 'POST';
}

function extractChequeFields(method: PaymentMethodEnum, f: MethodFieldValues) {
  if (method !== 'CHEQUE') return {};
  return {
    chequeNumber: f.chequeNumber.trim() || undefined,
    chequeBank: f.chequeBank.trim() || undefined,
    chequeBranch: f.chequeBranch.trim() || undefined,
    chequeDate: f.chequeDate || undefined,
    chequeDrawer: f.chequeDrawer.trim() || undefined,
  };
}

function extractMobileFields(method: PaymentMethodEnum, f: MethodFieldValues) {
  if (method !== 'BKASH' && method !== 'NAGAD') return {};
  return {
    mobileTrxId: f.mobileTrxId.trim() || undefined,
    mobileSenderPhone: f.mobileSenderPhone.trim() || undefined,
  };
}

function extractBankCardFields(method: PaymentMethodEnum, f: MethodFieldValues) {
  if (method === 'BANK_TRANSFER') {
    return {
      bankName: f.bankName.trim() || undefined,
      bankAccountRef: f.bankAccountRef.trim() || undefined,
    };
  }
  if (method === 'CARD') {
    return {
      cardLast4: f.cardLast4.trim() || undefined,
      cardSlipRef: f.cardSlipRef.trim() || undefined,
    };
  }
  return {};
}

export function buildPaymentPayload(params: BuildPayloadParams): PaymentEntryInput {
  const {
    bookingId,
    customerId,
    amountPaisa,
    paymentDate,
    method,
    referenceNotes,
    fields,
    actionType,
  } = params;

  return {
    bookingId,
    customerId,
    amountPaisa,
    paymentDate,
    paymentMethod: method,
    referenceNotes: referenceNotes.trim() || undefined,
    actionType: actionType ?? 'DRAFT',
    ...extractChequeFields(method, fields),
    ...extractMobileFields(method, fields),
    ...extractBankCardFields(method, fields),
  };
}
