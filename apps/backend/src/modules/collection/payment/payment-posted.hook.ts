import { Injectable, Logger } from '@nestjs/common';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';

export interface PaymentPostedEvent {
  paymentId: string;
  companyId: string;
  bookingId?: string | null;
  customerId: string;
  propertyId?: string | null;
  projectId?: string | null;
  amountPaisa: bigint;
  paymentType: string;
  paymentMethod: string;
  postedById: string;
  receiptNumber?: string;
  receiptId?: string;
}

export interface PaymentPostedHook {
  readonly hookName: string;
  onPaymentPosted(tx: TenantPrisma, event: PaymentPostedEvent): Promise<void>;
}

@Injectable()
export class PaymentPostedHookRegistry {
  private readonly logger = new Logger(PaymentPostedHookRegistry.name);
  private readonly hooks: PaymentPostedHook[] = [];

  register(hook: PaymentPostedHook): void {
    this.hooks.push(hook);
    this.logger.log(`Registered in-transaction PaymentPostedHook: ${hook.hookName}`);
  }

  async execute(tx: TenantPrisma, event: PaymentPostedEvent): Promise<void> {
    for (const hook of this.hooks) {
      await hook.onPaymentPosted(tx, event);
    }
  }
}
