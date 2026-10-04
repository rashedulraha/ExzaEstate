import {
  LateFeeChargedPayload,
  LateFeeWaivedPayload,
  PostingJournalInstruction,
  PostingRuleHandler,
  PostingRuleRecord,
} from './posting-rule.interface.js';

export class LateFeeChargedRule implements PostingRuleHandler<LateFeeChargedPayload> {
  readonly eventType = 'LATE_FEE_CHARGED';

  buildInstructions(
    payload: LateFeeChargedPayload,
    rule: PostingRuleRecord,
  ): PostingJournalInstruction[] {
    const feeAmount = BigInt(payload.feePaisa);
    const receivableAccount = rule.accountMappings['receivable'] ?? '1100';
    const lateFeeIncomeAccount = rule.accountMappings['lateFeeIncome'] ?? '4200';

    return [
      {
        narration: payload.description ?? 'Late fee charged on overdue installment',
        reference: payload.reference,
        sourceModule: 'collection',
        sourceEventType: this.eventType,
        postingDate: new Date(payload.postingDate),
        type: 'SYSTEM',
        lines: [
          {
            accountCode: receivableAccount,
            debitPaisa: feeAmount,
            description: 'Late fee receivable',
            partyType: 'CUSTOMER',
            partyId: payload.customerId,
            projectId: payload.projectId,
          },
          {
            accountCode: lateFeeIncomeAccount,
            creditPaisa: feeAmount,
            description: 'Late fee income',
            projectId: payload.projectId,
          },
        ],
      },
    ];
  }
}

export class LateFeeWaivedRule implements PostingRuleHandler<LateFeeWaivedPayload> {
  readonly eventType = 'LATE_FEE_WAIVED';

  buildInstructions(
    payload: LateFeeWaivedPayload,
    rule: PostingRuleRecord,
  ): PostingJournalInstruction[] {
    const feeAmount = BigInt(payload.feePaisa);
    const receivableAccount = rule.accountMappings['receivable'] ?? '1100';
    const lateFeeIncomeAccount = rule.accountMappings['lateFeeIncome'] ?? '4200';

    return [
      {
        narration: `Late fee waived: ${payload.reason ?? 'Approved waiver'}`,
        reference: payload.reference,
        sourceModule: 'collection',
        sourceEventType: this.eventType,
        postingDate: new Date(payload.postingDate),
        type: 'SYSTEM',
        lines: [
          {
            accountCode: lateFeeIncomeAccount,
            debitPaisa: feeAmount,
            description: 'Late fee income reversal / waiver',
            projectId: payload.projectId,
          },
          {
            accountCode: receivableAccount,
            creditPaisa: feeAmount,
            description: 'Late fee receivable credited',
            partyType: 'CUSTOMER',
            partyId: payload.customerId,
            projectId: payload.projectId,
          },
        ],
      },
    ];
  }
}
