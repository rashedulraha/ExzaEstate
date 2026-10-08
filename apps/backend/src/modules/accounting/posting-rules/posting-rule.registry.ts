import { Injectable } from '@nestjs/common';
import { PostingRuleHandler } from './posting-rule.interface.js';
import { BookingConfirmedRule } from './booking-confirmed.rule.js';
import { ChequeClearedRule, PaymentPostedRule } from './payment-posted.rule.js';
import { PaymentReversedRule } from './payment-reversed.rule.js';
import { InstallmentWaivedRule, LateFeeChargedRule, LateFeeWaivedRule } from './late-fee.rule.js';
import { BookingCancelledRule } from './booking-cancelled.rule.js';
import { RefundPaidRule } from './refund-paid.rule.js';
import {
  ExpenseApprovedPaidRule,
  VendorBillPostedRule,
  VendorPaymentRule,
} from './ops-expense.rules.js';
import {
  CashTransferRule,
  CommissionApprovedRule,
  CommissionPaidRule,
} from './ops-commission-transfer.rules.js';
import { CostOfLandSoldRule, DevelopmentCostRule, LandPurchaseRule } from './ops-land-dev.rules.js';

@Injectable()
export class PostingRuleRegistry {
  private readonly handlers = new Map<string, PostingRuleHandler>();

  constructor() {
    this.register(new BookingConfirmedRule());
    this.register(new PaymentPostedRule());
    this.register(new ChequeClearedRule());
    this.register(new PaymentReversedRule());
    this.register(new LateFeeChargedRule());
    this.register(new LateFeeWaivedRule());
    this.register(new InstallmentWaivedRule());

    this.register(new BookingCancelledRule());
    this.register(new RefundPaidRule());
    this.register(new ExpenseApprovedPaidRule());
    this.register(new VendorBillPostedRule());
    this.register(new VendorPaymentRule());
    this.register(new CommissionApprovedRule());
    this.register(new CommissionPaidRule());
    this.register(new CashTransferRule());
    this.register(new LandPurchaseRule());
    this.register(new DevelopmentCostRule());
    this.register(new CostOfLandSoldRule());
  }

  register(handler: PostingRuleHandler): void {
    this.handlers.set(handler.eventType, handler);
  }

  getHandler(eventType: string): PostingRuleHandler | undefined {
    return this.handlers.get(eventType);
  }

  hasHandler(eventType: string): boolean {
    return this.handlers.has(eventType);
  }

  getAllRegisteredEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}
