import {
  AccountingSettings,
  BookingConfirmedPayload,
  PostingJournalInstruction,
  PostingLineInstruction,
  PostingRuleHandler,
  PostingRuleRecord,
} from './posting-rule.interface.js';

interface BookingAccounts {
  receivable: string;
  vat: string;
  discount: string;
  revenue: string;
}

function resolveBookingAccounts(rule: PostingRuleRecord, mode: string): BookingAccounts {
  return {
    receivable: rule.accountMappings['receivable'] ?? '1100',
    vat: rule.accountMappings['vat'] ?? '2400',
    discount: rule.accountMappings['discount'] ?? '5900',
    revenue:
      mode === 'ON_BOOKING'
        ? (rule.accountMappings['revenue'] ?? '4100')
        : (rule.accountMappings['unearnedRevenue'] ?? '2600'),
  };
}

function buildGrossDiscountLines(
  payload: BookingConfirmedPayload,
  accounts: BookingAccounts,
  netPrice: bigint,
  discount: bigint,
  vat: bigint,
): PostingLineInstruction[] {
  const lines: PostingLineInstruction[] = [
    {
      accountCode: accounts.receivable,
      debitPaisa: netPrice,
      description: `Receivable for booking ${payload.bookingNumber}`,
      partyType: 'CUSTOMER',
      partyId: payload.customerId,
      projectId: payload.projectId,
    },
    {
      accountCode: accounts.discount,
      debitPaisa: discount,
      description: `Discount allowed on booking ${payload.bookingNumber}`,
      projectId: payload.projectId,
    },
    {
      accountCode: accounts.revenue,
      creditPaisa: netPrice + discount - vat,
      description: `Property sale revenue for booking ${payload.bookingNumber}`,
      projectId: payload.projectId,
    },
  ];

  if (vat > 0n) {
    lines.push({
      accountCode: accounts.vat,
      creditPaisa: vat,
      description: `VAT payable on booking ${payload.bookingNumber}`,
      projectId: payload.projectId,
    });
  }

  return lines;
}

function buildNetBookingLines(
  payload: BookingConfirmedPayload,
  accounts: BookingAccounts,
  netPrice: bigint,
  vat: bigint,
): PostingLineInstruction[] {
  const lines: PostingLineInstruction[] = [
    {
      accountCode: accounts.receivable,
      debitPaisa: netPrice,
      description: `Receivable for booking ${payload.bookingNumber}`,
      partyType: 'CUSTOMER',
      partyId: payload.customerId,
      projectId: payload.projectId,
    },
    {
      accountCode: accounts.revenue,
      creditPaisa: netPrice - vat,
      description: `Property sale revenue for booking ${payload.bookingNumber}`,
      projectId: payload.projectId,
    },
  ];

  if (vat > 0n) {
    lines.push({
      accountCode: accounts.vat,
      creditPaisa: vat,
      description: `VAT payable on booking ${payload.bookingNumber}`,
      projectId: payload.projectId,
    });
  }

  return lines;
}

export class BookingConfirmedRule implements PostingRuleHandler<BookingConfirmedPayload> {
  readonly eventType = 'BOOKING_CONFIRMED';

  buildInstructions(
    payload: BookingConfirmedPayload,
    rule: PostingRuleRecord,
    settings: AccountingSettings,
  ): PostingJournalInstruction[] {
    const netPrice = BigInt(payload.netPricePaisa);
    const vat = BigInt(payload.vatPaisa ?? 0);
    const discount = BigInt(payload.discountPaisa ?? 0);
    const recognitionMode = settings.revenue_recognition ?? 'ON_BOOKING';
    const accounts = resolveBookingAccounts(rule, recognitionMode);

    const isGrossDiscount = settings.show_discount_gross === true && discount > 0n;
    const lines = isGrossDiscount
      ? buildGrossDiscountLines(payload, accounts, netPrice, discount, vat)
      : buildNetBookingLines(payload, accounts, netPrice, vat);

    return [
      {
        narration: `Booking confirmation for ${payload.bookingNumber} (${recognitionMode})`,
        reference: payload.reference ?? payload.bookingNumber,
        sourceModule: 'sales',
        sourceDocumentId: payload.bookingId,
        sourceEventType: this.eventType,
        postingDate: new Date(payload.postingDate),
        type: 'SYSTEM',
        lines,
      },
    ];
  }
}
