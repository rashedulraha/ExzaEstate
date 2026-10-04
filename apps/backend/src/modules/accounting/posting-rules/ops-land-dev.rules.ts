import {
  CostOfLandSoldPayload,
  DevelopmentCostPayload,
  LandPurchasePayload,
  PostingJournalInstruction,
  PostingRuleHandler,
  PostingRuleRecord,
} from './posting-rule.interface.js';

function resolveLandDevCreditAccount(
  paymentMethod: string | undefined,
  bankAccountCode: string | undefined,
  rule: PostingRuleRecord,
): string {
  if (paymentMethod === 'CREDIT') {
    return rule.accountMappings['ap'] ?? '2100';
  }
  if (paymentMethod === 'CASH') {
    return rule.accountMappings['cash'] ?? '1010';
  }
  return bankAccountCode ?? rule.accountMappings['bank'] ?? '1020';
}

export class LandPurchaseRule implements PostingRuleHandler<LandPurchasePayload> {
  readonly eventType = 'LAND_PURCHASE';

  buildInstructions(
    payload: LandPurchasePayload,
    rule: PostingRuleRecord,
  ): PostingJournalInstruction[] {
    const amount = BigInt(payload.amountPaisa);
    const inventoryAccount = rule.accountMappings['landInventory'] ?? '1200';
    const creditAccount = resolveLandDevCreditAccount(
      payload.paymentMethod,
      payload.bankAccountCode,
      rule,
    );
    const isCredit = payload.paymentMethod === 'CREDIT' && payload.vendorId;

    return [
      {
        narration: payload.description ?? 'Land inventory purchase capitalization',
        reference: payload.reference,
        sourceModule: 'land',
        sourceEventType: this.eventType,
        postingDate: new Date(payload.postingDate),
        type: 'SYSTEM',
        lines: [
          {
            accountCode: inventoryAccount,
            debitPaisa: amount,
            description: 'Land purchase capitalized',
          },
          {
            accountCode: creditAccount,
            creditPaisa: amount,
            description: 'Payment/liability for land purchase',
            partyType: isCredit ? 'VENDOR' : undefined,
            partyId: isCredit ? payload.vendorId : undefined,
          },
        ],
      },
    ];
  }
}

export class DevelopmentCostRule implements PostingRuleHandler<DevelopmentCostPayload> {
  readonly eventType = 'DEVELOPMENT_COST';

  buildInstructions(
    payload: DevelopmentCostPayload,
    rule: PostingRuleRecord,
  ): PostingJournalInstruction[] {
    const amount = BigInt(payload.amountPaisa);
    const wipAccount = rule.accountMappings['developmentWip'] ?? '1210';
    const creditAccount = resolveLandDevCreditAccount(
      payload.paymentMethod,
      payload.bankAccountCode,
      rule,
    );
    const isCredit = payload.paymentMethod === 'CREDIT' && payload.vendorId;

    return [
      {
        narration: payload.description ?? 'Project development cost capitalized to WIP',
        reference: payload.reference,
        sourceModule: 'development',
        sourceEventType: this.eventType,
        postingDate: new Date(payload.postingDate),
        type: 'SYSTEM',
        lines: [
          {
            accountCode: wipAccount,
            debitPaisa: amount,
            description: 'Development WIP cost',
            costCenter: payload.costCenter,
            projectId: payload.projectId,
          },
          {
            accountCode: creditAccount,
            creditPaisa: amount,
            description: 'Payment/liability for development cost',
            partyType: isCredit ? 'VENDOR' : undefined,
            partyId: isCredit ? payload.vendorId : undefined,
          },
        ],
      },
    ];
  }
}

export class CostOfLandSoldRule implements PostingRuleHandler<CostOfLandSoldPayload> {
  readonly eventType = 'COST_OF_LAND_SOLD';

  buildInstructions(
    payload: CostOfLandSoldPayload,
    rule: PostingRuleRecord,
  ): PostingJournalInstruction[] {
    const amount = BigInt(payload.amountPaisa);
    const costOfLandSoldAccount = rule.accountMappings['costOfLandSold'] ?? '5100';
    const wipAccount = rule.accountMappings['developmentWip'] ?? '1210';

    return [
      {
        narration: payload.description ?? 'Cost of land sold recognized on handover completed',
        reference: payload.reference,
        sourceModule: 'sales',
        sourceEventType: this.eventType,
        postingDate: new Date(payload.postingDate),
        type: 'SYSTEM',
        lines: [
          {
            accountCode: costOfLandSoldAccount,
            debitPaisa: amount,
            description: 'Cost of land sold expense',
            costCenter: payload.costCenter,
            projectId: payload.projectId,
          },
          {
            accountCode: wipAccount,
            creditPaisa: amount,
            description: 'Development WIP transferred out on handover',
            costCenter: payload.costCenter,
            projectId: payload.projectId,
          },
        ],
      },
    ];
  }
}
