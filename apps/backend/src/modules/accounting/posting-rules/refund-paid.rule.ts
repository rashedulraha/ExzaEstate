import {
  PostingJournalInstruction,
  PostingRuleHandler,
  PostingRuleRecord,
  RefundPaidPayload,
} from './posting-rule.interface.js';

export class RefundPaidRule implements PostingRuleHandler<RefundPaidPayload> {
  readonly eventType = 'REFUND_PAID';

  buildInstructions(
    payload: RefundPaidPayload,
    rule: PostingRuleRecord,
  ): PostingJournalInstruction[] {
    const refundAmount = BigInt(payload.refundPaisa);
    const refundsPayableAccount = rule.accountMappings['refundsPayable'] ?? '2500';

    let cashBankAccount: string;
    if (payload.paymentMethod === 'CASH') {
      cashBankAccount = rule.accountMappings['cash'] ?? '1010';
    } else {
      cashBankAccount = payload.bankAccountCode ?? rule.accountMappings['bank'] ?? '1020';
    }

    return [
      {
        narration: `Refund disbursement: ${payload.refundId}`,
        reference: payload.reference ?? payload.refundId,
        sourceModule: 'collection',
        sourceDocumentId: payload.refundId,
        sourceEventType: this.eventType,
        postingDate: new Date(payload.postingDate),
        type: 'SYSTEM',
        lines: [
          {
            accountCode: refundsPayableAccount,
            debitPaisa: refundAmount,
            description: 'Refund payable settled',
            partyType: 'CUSTOMER',
            partyId: payload.customerId,
          },
          {
            accountCode: cashBankAccount,
            creditPaisa: refundAmount,
            description: `Refund paid via ${payload.paymentMethod ?? 'BANK_TRANSFER'}`,
          },
        ],
      },
    ];
  }
}
