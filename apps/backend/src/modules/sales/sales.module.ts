import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ApprovalsModule } from '../approvals/approvals.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ChargeController } from './charges/charge.controller.js';
import { ChargeService } from './charges/charge.service.js';
import { PaymentPlanController } from './payment-plan/payment-plan.controller.js';
import { PaymentPlanService } from './payment-plan/payment-plan.service.js';
import { QuotationController } from './quotation/quotation.controller.js';
import { QuotationService } from './quotation/quotation.service.js';
import { QuotationLifecycleService } from './quotation/quotation-lifecycle.service.js';
import { QuotationPdfService } from './pdf/quotation-pdf.service.js';
import { QuotationDiscountApprovalHandler } from './approval-handlers/quotation-discount.handler.js';

import { BookingController } from './booking/booking.controller.js';
import { BookingService } from './booking/booking.service.js';
import { BookingValidationService } from './booking/booking-validation.service.js';
import { ReservationExpiryService } from './booking/jobs/reservation-expiry.service.js';
import { AgreementController } from './agreement/agreement.controller.js';
import { AgreementService } from './agreement/agreement.service.js';
import { AgreementLifecycleService } from './agreement/agreement-lifecycle.service.js';
import { AgreementPdfService } from './agreement/pdf/agreement-pdf.service.js';
import { CancellationController } from './cancellation/cancellation.controller.js';
import { CancellationService } from './cancellation/cancellation.service.js';
import { BookingTransferController } from './transfer/booking-transfer.controller.js';
import { BookingTransferService } from './transfer/booking-transfer.service.js';
import { CollectionModule } from '../collection/collection.module.js';
import { PaymentPostedHookRegistry } from '../collection/payment/payment-posted.hook.js';
import { PostingModule } from '../accounting/posting/posting.module.js';
import { BookingConfirmationPaymentHook } from './booking/payment-hook.js';
import type { OnModuleInit } from '@nestjs/common';

@Module({
  imports: [
    DatabaseModule,
    PlatformModule,
    AuthModule,
    ApprovalsModule,
    NotificationsModule,
    CollectionModule,
    PostingModule,
  ],
  controllers: [
    PaymentPlanController,
    ChargeController,
    QuotationController,
    BookingController,
    AgreementController,
    CancellationController,
    BookingTransferController,
  ],
  providers: [
    PaymentPlanService,
    ChargeService,
    QuotationService,
    QuotationLifecycleService,
    QuotationPdfService,
    QuotationDiscountApprovalHandler,
    BookingValidationService,
    BookingService,
    ReservationExpiryService,
    AgreementService,
    AgreementLifecycleService,
    AgreementPdfService,
    BookingConfirmationPaymentHook,
    CancellationService,
    BookingTransferService,
  ],
  exports: [
    PaymentPlanService,
    ChargeService,
    QuotationService,
    QuotationLifecycleService,
    QuotationPdfService,
    QuotationDiscountApprovalHandler,
    BookingValidationService,
    BookingService,
    ReservationExpiryService,
    AgreementService,
    AgreementLifecycleService,
    AgreementPdfService,
    BookingConfirmationPaymentHook,
    CancellationService,
    BookingTransferService,
  ],
})
export class SalesModule implements OnModuleInit {
  constructor(
    private readonly hookRegistry: PaymentPostedHookRegistry,
    private readonly bookingConfirmationHook: BookingConfirmationPaymentHook,
  ) {}

  onModuleInit(): void {
    this.hookRegistry.register(this.bookingConfirmationHook);
  }
}
