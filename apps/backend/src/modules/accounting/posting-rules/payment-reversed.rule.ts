import {
  PaymentReversedPayload,
  PostingJournalInstruction,
  PostingLineInstruction,
  PostingRuleHandler,
  PostingRuleRecord,
} from './posting-rule.interface.js';

export class PaymentReversedRule
  implements
    PostingRuleHandler<
      PaymentReversedPayload & {
        originalLines?: Array<{
          accountCode: string;
          debitPaisa: bigint;
          creditPaisa: bigint;
          partyType?: string | null;
          partyId?: string | null;
          projectId?: string | null;
        }>;
      }
    >
{
  readonly eventType = 'PAYMENT_REVERSED';

  buildInstructions(
    payload: PaymentReversedPayload & {
      originalLines?: Array<{
        accountCode: string;
        debitPaisa: bigint;
        creditPaisa: bigint;
        partyType?: string | null;
        partyId?: string | null;
        projectId?: string | null;
      }>;
    },
    _rule: PostingRuleRecord,
  ): PostingJournalInstruction[] {
    const lines: PostingLineInstruction[] = (payload.originalLines ?? []).map((origLine) => ({
      accountCode: origLine.accountCode,
      // Mirror debit and credit amounts
      debitPaisa: origLine.creditPaisa,
      creditPaisa: origLine.debitPaisa,
      description: `Reversal: ${payload.reason}`,
      partyType: (origLine.partyType as 'CUSTOMER' | 'VENDOR' | 'BROKER') ?? undefined,
      partyId: origLine.partyId ?? undefined,
      projectId: origLine.projectId ?? undefined,
    }));

    return [
      {
        narration: `Reversal of payment journal: ${payload.reason}`,
        reference: payload.reference ?? `REV-${payload.paymentId}`,
        sourceModule: 'collection',
        sourceDocumentId: payload.paymentId,
        sourceEventType: this.eventType,
        postingDate: new Date(payload.postingDate),
        type: 'REVERSAL',
        lines,
      },
    ];
  }
}
