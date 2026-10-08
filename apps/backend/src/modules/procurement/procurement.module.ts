import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { PlatformModule } from '../../platform/platform.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { PostingModule } from '../accounting/posting/posting.module.js';
import { VendorController } from './vendor/vendor.controller.js';
import { VendorService } from './vendor/vendor.service.js';
import { VendorBillController } from './bill/vendor-bill.controller.js';
import { VendorBillService } from './bill/vendor-bill.service.js';
import { VendorPaymentController } from './payment/vendor-payment.controller.js';
import { VendorPaymentService } from './payment/vendor-payment.service.js';
import { VendorApController } from './arap/vendor-ap.controller.js';
import { VendorApService } from './arap/vendor-ap.service.js';
import { PurchaseRequestController } from './purchase-request/purchase-request.controller.js';
import { PurchaseRequestService } from './purchase-request/purchase-request.service.js';
import { PurchaseOrderController } from './purchase-order/purchase-order.controller.js';
import { PurchaseOrderService } from './purchase-order/purchase-order.service.js';
import { GoodsReceiptController } from './goods-receipt/goods-receipt.controller.js';
import { GoodsReceiptService } from './goods-receipt/goods-receipt.service.js';

@Module({
  imports: [DatabaseModule, PlatformModule, AuthModule, PostingModule],
  controllers: [
    VendorController,
    VendorBillController,
    VendorPaymentController,
    VendorApController,
    PurchaseRequestController,
    PurchaseOrderController,
    GoodsReceiptController,
  ],
  providers: [
    VendorService,
    VendorBillService,
    VendorPaymentService,
    VendorApService,
    PurchaseRequestService,
    PurchaseOrderService,
    GoodsReceiptService,
  ],
  exports: [
    VendorService,
    VendorBillService,
    VendorPaymentService,
    VendorApService,
    PurchaseRequestService,
    PurchaseOrderService,
    GoodsReceiptService,
  ],
})
export class ProcurementModule {}
