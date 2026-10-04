import {
  ExpenseApprovedPaidPayload,
  PostingJournalInstruction,
  PostingRuleHandler,
  PostingRuleRecord,
  VendorBillPostedPayload,
  VendorPaymentPayload,
} from './posting-rule.interface.js';

function resolveExpenseCreditAccount(
  payload: ExpenseApprovedPaidPayload,
  rule: PostingRuleRecord,
): string {
  if (payload.paidLater) {
    return rule.accountMappings['ap'] ?? '2100';
  }
  if (payload.paymentMethod === 'CASH') {
    return rule.accountMappings['cash'] ?? '1010';
  }
  return payload.bankAccountCode ?? rule.accountMappings['bank'] ?? '1020';
}

export class ExpenseApprovedPaidRule implements PostingRuleHandler<ExpenseApprovedPaidPayload> {
  readonly eventType = 'EXPENSE_APPROVED_PAID';

  buildInstructions(
    payload: ExpenseApprovedPaidPayload,
    rule: PostingRuleRecord,
  ): PostingJournalInstruction[] {
    const amount = BigInt(payload.amountPaisa);
    const expenseAccount =
      payload.expenseAccountCode ?? rule.accountMappings['defaultExpense'] ?? '5500';
    const creditAccount = resolveExpenseCreditAccount(payload, rule);

    return [
      {
        narration: payload.description ?? `Approved expense: ${payload.expenseId}`,
        reference: payload.reference ?? payload.expenseId,
        sourceModule: 'operations',
        sourceDocumentId: payload.expenseId,
        sourceEventType: this.eventType,
        postingDate: new Date(payload.postingDate),
        type: 'SYSTEM',
        lines: [
          {
            accountCode: expenseAccount,
            debitPaisa: amount,
            description: payload.description ?? 'Operational expense',
            costCenter: payload.costCenter,
            projectId: payload.projectId,
          },
          {
            accountCode: creditAccount,
            creditPaisa: amount,
            description: payload.paidLater ? 'Accounts payable accrued' : 'Paid out via cash/bank',
            partyType: payload.paidLater && payload.vendorId ? 'VENDOR' : undefined,
            partyId: payload.paidLater ? payload.vendorId : undefined,
          },
        ],
      },
    ];
  }
}

export class VendorBillPostedRule implements PostingRuleHandler<VendorBillPostedPayload> {
  readonly eventType = 'VENDOR_BILL_POSTED';

  buildInstructions(
    payload: VendorBillPostedPayload,
    rule: PostingRuleRecord,
  ): PostingJournalInstruction[] {
    const amount = BigInt(payload.amountPaisa);
    const debitAccount = payload.debitAccountCode ?? rule.accountMappings['wip'] ?? '1210';
    const apAccount = rule.accountMappings['ap'] ?? '2100';

    return [
      {
        narration: payload.description ?? `Vendor bill posted: ${payload.billId}`,
        reference: payload.reference ?? payload.billId,
        sourceModule: 'procurement',
        sourceDocumentId: payload.billId,
        sourceEventType: this.eventType,
        postingDate: new Date(payload.postingDate),
        type: 'SYSTEM',
        lines: [
          {
            accountCode: debitAccount,
            debitPaisa: amount,
            description: payload.description ?? 'Vendor bill charges',
            costCenter: payload.costCenter,
            projectId: payload.projectId,
          },
          {
            accountCode: apAccount,
            creditPaisa: amount,
            description: 'Accounts payable accrued for vendor',
            partyType: 'VENDOR',
            partyId: payload.vendorId,
          },
        ],
      },
    ];
  }
}

export class VendorPaymentRule implements PostingRuleHandler<VendorPaymentPayload> {
  readonly eventType = 'VENDOR_PAYMENT';

  buildInstructions(
    payload: VendorPaymentPayload,
    rule: PostingRuleRecord,
  ): PostingJournalInstruction[] {
    const amount = BigInt(payload.amountPaisa);
    const apAccount = rule.accountMappings['ap'] ?? '2100';
    const creditAccount =
      payload.paymentMethod === 'CASH'
        ? (rule.accountMappings['cash'] ?? '1010')
        : (payload.bankAccountCode ?? rule.accountMappings['bank'] ?? '1020');

    return [
      {
        narration: `Vendor payment: ${payload.paymentId}`,
        reference: payload.reference ?? payload.paymentId,
        sourceModule: 'procurement',
        sourceDocumentId: payload.paymentId,
        sourceEventType: this.eventType,
        postingDate: new Date(payload.postingDate),
        type: 'SYSTEM',
        lines: [
          {
            accountCode: apAccount,
            debitPaisa: amount,
            description: 'Accounts payable settled',
            partyType: 'VENDOR',
            partyId: payload.vendorId,
          },
          {
            accountCode: creditAccount,
            creditPaisa: amount,
            description: `Payment disbursed via ${payload.paymentMethod ?? 'BANK_TRANSFER'}`,
          },
        ],
      },
    ];
  }
}
