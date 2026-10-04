import {
  CashTransferPayload,
  CommissionApprovedPayload,
  CommissionPaidPayload,
  PostingJournalInstruction,
  PostingRuleHandler,
  PostingRuleRecord,
} from './posting-rule.interface.js';

export class CommissionApprovedRule implements PostingRuleHandler<CommissionApprovedPayload> {
  readonly eventType = 'COMMISSION_APPROVED';

  buildInstructions(
    payload: CommissionApprovedPayload,
    rule: PostingRuleRecord,
  ): PostingJournalInstruction[] {
    const amount = BigInt(payload.amountPaisa);
    const expenseAccount = rule.accountMappings['commissionExpense'] ?? '5400';
    const payableAccount = rule.accountMappings['commissionPayable'] ?? '2300';

    return [
      {
        narration: `Broker commission approved for broker ${payload.brokerId}`,
        reference: payload.reference,
        sourceModule: 'sales',
        sourceEventType: this.eventType,
        postingDate: new Date(payload.postingDate),
        type: 'SYSTEM',
        lines: [
          {
            accountCode: expenseAccount,
            debitPaisa: amount,
            description: 'Broker commission expense',
            projectId: payload.projectId,
          },
          {
            accountCode: payableAccount,
            creditPaisa: amount,
            description: 'Broker commission payable accrued',
            partyType: 'BROKER',
            partyId: payload.brokerId,
            projectId: payload.projectId,
          },
        ],
      },
    ];
  }
}

export class CommissionPaidRule implements PostingRuleHandler<CommissionPaidPayload> {
  readonly eventType = 'COMMISSION_PAID';

  buildInstructions(
    payload: CommissionPaidPayload,
    rule: PostingRuleRecord,
  ): PostingJournalInstruction[] {
    const amount = BigInt(payload.amountPaisa);
    const payableAccount = rule.accountMappings['commissionPayable'] ?? '2300';
    const creditAccount =
      payload.paymentMethod === 'CASH'
        ? (rule.accountMappings['cash'] ?? '1010')
        : (payload.bankAccountCode ?? rule.accountMappings['bank'] ?? '1020');

    return [
      {
        narration: `Broker commission paid to broker ${payload.brokerId}`,
        reference: payload.reference,
        sourceModule: 'sales',
        sourceEventType: this.eventType,
        postingDate: new Date(payload.postingDate),
        type: 'SYSTEM',
        lines: [
          {
            accountCode: payableAccount,
            debitPaisa: amount,
            description: 'Broker commission payable settled',
            partyType: 'BROKER',
            partyId: payload.brokerId,
          },
          {
            accountCode: creditAccount,
            creditPaisa: amount,
            description: `Commission paid via ${payload.paymentMethod ?? 'BANK_TRANSFER'}`,
          },
        ],
      },
    ];
  }
}

export class CashTransferRule implements PostingRuleHandler<CashTransferPayload> {
  readonly eventType = 'CASH_TRANSFER';

  buildInstructions(payload: CashTransferPayload): PostingJournalInstruction[] {
    const amount = BigInt(payload.amountPaisa);

    return [
      {
        narration: payload.narration ?? 'Internal cash/bank transfer',
        reference: payload.reference,
        sourceModule: 'cashbank',
        sourceEventType: this.eventType,
        postingDate: new Date(payload.postingDate),
        type: 'SYSTEM',
        lines: [
          {
            accountCode: payload.destinationAccountCode,
            debitPaisa: amount,
            description: 'Funds received in destination account',
          },
          {
            accountCode: payload.sourceAccountCode,
            creditPaisa: amount,
            description: 'Funds transferred out from source account',
          },
        ],
      },
    ];
  }
}
