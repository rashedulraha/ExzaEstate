import { HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@exzaestate/shared';
import { AppException } from '../../../common/exceptions/app.exception.js';
import {
  AccountingSettings,
  ChequeClearedPayload,
  PaymentPostedPayload,
  PostingJournalInstruction,
  PostingLineInstruction,
  PostingRuleHandler,
  PostingRuleRecord,
} from './posting-rule.interface.js';

function resolveAssetAccount(
  method: string,
  bankAccountCode: string | undefined,
  rule: PostingRuleRecord,
): string {
  if (method === 'CASH') return rule.accountMappings['cash'] ?? '1010';
  if (method === 'MOBILE_WALLET') return rule.accountMappings['wallet'] ?? '1030';
  if (method === 'CHEQUE') return rule.accountMappings['cheque'] ?? '1040';
  return bankAccountCode ?? rule.accountMappings['bank'] ?? '1020';
}

function buildCreditLines(
  payload: PaymentPostedPayload,
  rule: PostingRuleRecord,
  settings: AccountingSettings,
  allocated: bigint,
  overpayment: bigint,
  unallocated: bigint,
): PostingLineInstruction[] {
  const lines: PostingLineInstruction[] = [];

  if (allocated > 0n) {
    lines.push({
      accountCode: rule.accountMappings['receivable'] ?? '1100',
      creditPaisa: allocated,
      description: 'Allocated payment receipt for customer',
      partyType: 'CUSTOMER',
      partyId: payload.customerId,
      projectId: payload.projectId,
    });
  }

  if (overpayment > 0n) {
    lines.push({
      accountCode: rule.accountMappings['advances'] ?? '2200',
      creditPaisa: overpayment,
      description: 'Customer advance / excess payment',
      partyType: 'CUSTOMER',
      partyId: payload.customerId,
      projectId: payload.projectId,
    });
  }

  if (unallocated > 0n) {
    if (!settings.allow_suspense_receipts) {
      throw new AppException(
        ERROR_CODES.VALIDATION_ERROR,
        'Unallocated payment receipts are rejected because allow_suspense_receipts is disabled',
        { unallocated: unallocated.toString() },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    lines.push({
      accountCode: rule.accountMappings['suspense'] ?? '1900',
      creditPaisa: unallocated,
      description: 'Suspense unallocated receipt',
      partyType: 'CUSTOMER',
      partyId: payload.customerId,
      projectId: payload.projectId,
    });
  }

  return lines;
}

export class PaymentPostedRule implements PostingRuleHandler<PaymentPostedPayload> {
  readonly eventType = 'PAYMENT_POSTED';

  buildInstructions(
    payload: PaymentPostedPayload,
    rule: PostingRuleRecord,
    settings: AccountingSettings,
  ): PostingJournalInstruction[] {
    const totalAmount = BigInt(payload.amountPaisa);
    const allocated = BigInt(payload.allocatedPaisa);
    const overpayment = BigInt(payload.overpaymentPaisa ?? 0);
    const unallocated = BigInt(payload.unallocatedPaisa ?? 0);

    if (allocated + overpayment + unallocated !== totalAmount) {
      throw new AppException(
        ERROR_CODES.VALIDATION_ERROR,
        `Payment breakdown sum (${allocated + overpayment + unallocated}) does not match total amount (${totalAmount})`,
        { totalAmount: totalAmount.toString() },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const assetAccount = resolveAssetAccount(payload.paymentMethod, payload.bankAccountCode, rule);
    const debitLine: PostingLineInstruction = {
      accountCode: assetAccount,
      debitPaisa: totalAmount,
      description: `Payment receipt via ${payload.paymentMethod}`,
      partyType: 'CUSTOMER',
      partyId: payload.customerId,
      projectId: payload.projectId,
    };

    const creditLines = buildCreditLines(
      payload,
      rule,
      settings,
      allocated,
      overpayment,
      unallocated,
    );

    return [
      {
        narration: `Payment posted ${payload.paymentNumber ?? payload.paymentId} via ${payload.paymentMethod}`,
        reference: payload.reference ?? payload.paymentNumber,
        sourceModule: 'collection',
        sourceDocumentId: payload.paymentId,
        sourceEventType: this.eventType,
        postingDate: new Date(payload.postingDate),
        type: 'SYSTEM',
        lines: [debitLine, ...creditLines],
      },
    ];
  }
}

export class ChequeClearedRule implements PostingRuleHandler<ChequeClearedPayload> {
  readonly eventType = 'CHEQUE_CLEARED';

  buildInstructions(
    payload: ChequeClearedPayload,
    rule: PostingRuleRecord,
  ): PostingJournalInstruction[] {
    const amount = BigInt(payload.amountPaisa);
    const bankAccount = payload.bankAccountCode ?? rule.accountMappings['bank'] ?? '1020';
    const chequeAccount = rule.accountMappings['cheque'] ?? '1040';

    return [
      {
        narration: `Cheque cleared: ${payload.chequeId}`,
        reference: payload.reference ?? payload.chequeId,
        sourceModule: 'collection',
        sourceDocumentId: payload.chequeId,
        sourceEventType: this.eventType,
        postingDate: new Date(payload.postingDate),
        type: 'SYSTEM',
        lines: [
          {
            accountCode: bankAccount,
            debitPaisa: amount,
            description: 'Cheque deposit cleared into bank account',
          },
          {
            accountCode: chequeAccount,
            creditPaisa: amount,
            description: 'Uncleared cheques in hand cleared',
          },
        ],
      },
    ];
  }
}
