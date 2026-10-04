import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import {
  AccountingSettings,
  BookingCancelledPayload,
  PostingJournalInstruction,
  PostingLineInstruction,
  PostingRuleHandler,
  PostingRuleRecord,
} from './posting-rule.interface.js';

function buildSaleReversalJournal(
  payload: BookingCancelledPayload,
  rule: PostingRuleRecord,
  settings: AccountingSettings,
  netPrice: bigint,
  vat: bigint,
  postingDate: Date,
): PostingJournalInstruction {
  const recognitionMode = settings.revenue_recognition ?? 'ON_BOOKING';
  const revenueAccount =
    recognitionMode === 'ON_BOOKING'
      ? (rule.accountMappings['revenue'] ?? '4100')
      : (rule.accountMappings['unearnedRevenue'] ?? '2600');
  const receivableAccount = rule.accountMappings['receivable'] ?? '1100';
  const vatAccount = rule.accountMappings['vat'] ?? '2400';

  const lines: PostingLineInstruction[] = [
    {
      accountCode: revenueAccount,
      debitPaisa: netPrice - vat,
      description: `Reversal of property sale revenue for cancelled booking ${payload.bookingNumber}`,
      projectId: payload.projectId,
    },
  ];

  if (vat > 0n) {
    lines.push({
      accountCode: vatAccount,
      debitPaisa: vat,
      description: `Reversal of VAT on cancelled booking ${payload.bookingNumber}`,
      projectId: payload.projectId,
    });
  }

  lines.push({
    accountCode: receivableAccount,
    creditPaisa: netPrice,
    description: `Reversal of receivable for cancelled booking ${payload.bookingNumber}`,
    partyType: 'CUSTOMER',
    partyId: payload.customerId,
    projectId: payload.projectId,
  });

  return {
    narration: `Booking cancellation: reverse sale ${payload.bookingNumber}`,
    reference: payload.reference ?? payload.bookingNumber,
    sourceModule: 'sales',
    sourceDocumentId: payload.bookingId,
    sourceEventType: 'BOOKING_CANCELLED',
    postingDate,
    type: 'SYSTEM',
    lines,
  };
}

function buildCreditSettlementJournal(
  payload: BookingCancelledPayload,
  rule: PostingRuleRecord,
  paidAmount: bigint,
  deduction: bigint,
  refund: bigint,
  postingDate: Date,
): PostingJournalInstruction {
  const receivableAccount = rule.accountMappings['receivable'] ?? '1100';
  const deductionIncomeAccount = rule.accountMappings['deductionIncome'] ?? '4300';
  const refundsPayableAccount = rule.accountMappings['refundsPayable'] ?? '2500';

  const lines: PostingLineInstruction[] = [
    {
      accountCode: receivableAccount,
      debitPaisa: paidAmount,
      description: `Settle paid balance on cancellation for booking ${payload.bookingNumber}`,
      partyType: 'CUSTOMER',
      partyId: payload.customerId,
      projectId: payload.projectId,
    },
  ];

  if (deduction > 0n) {
    lines.push({
      accountCode: deductionIncomeAccount,
      creditPaisa: deduction,
      description: `Cancellation deduction income for booking ${payload.bookingNumber}`,
      projectId: payload.projectId,
    });
  }

  if (refund > 0n) {
    lines.push({
      accountCode: refundsPayableAccount,
      creditPaisa: refund,
      description: `Refund payable to customer for cancelled booking ${payload.bookingNumber}`,
      partyType: 'CUSTOMER',
      partyId: payload.customerId,
      projectId: payload.projectId,
    });
  }

  return {
    narration: `Booking cancellation: settle customer credit ${payload.bookingNumber}`,
    reference: payload.reference ?? payload.bookingNumber,
    sourceModule: 'sales',
    sourceDocumentId: payload.bookingId,
    sourceEventType: 'BOOKING_CANCELLED',
    postingDate,
    type: 'SYSTEM',
    lines,
  };
}

export class BookingCancelledRule implements PostingRuleHandler<BookingCancelledPayload> {
  readonly eventType = 'BOOKING_CANCELLED';

  buildInstructions(
    payload: BookingCancelledPayload,
    rule: PostingRuleRecord,
    settings: AccountingSettings,
  ): PostingJournalInstruction[] {
    const netPrice = BigInt(payload.netPricePaisa);
    const vat = BigInt(payload.vatPaisa ?? 0);
    const paidAmount = BigInt(payload.paidAmountPaisa);
    const deduction = BigInt(payload.deductionPaisa);
    const refund = BigInt(payload.refundPaisa);

    if (deduction + refund !== paidAmount) {
      throw new AppException(
        ERROR_CODES.VALIDATION_ERROR,
        `Deduction (${deduction}) + refund (${refund}) does not equal paid amount (${paidAmount})`,
        {
          paidAmount: paidAmount.toString(),
          deduction: deduction.toString(),
          refund: refund.toString(),
        },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const postingDate = new Date(payload.postingDate);
    const journal1 = buildSaleReversalJournal(payload, rule, settings, netPrice, vat, postingDate);
    const journal2 = buildCreditSettlementJournal(
      payload,
      rule,
      paidAmount,
      deduction,
      refund,
      postingDate,
    );

    return [journal1, journal2];
  }
}
