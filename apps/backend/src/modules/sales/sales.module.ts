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

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule, ApprovalsModule, NotificationsModule],
  controllers: [
    PaymentPlanController,
    ChargeController,
    QuotationController,
    BookingController,
    AgreementController,
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
  ],
})
export class SalesModule {}
