import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ACTIVE_BOOKING_STATUSES, ERROR_CODES, PROPERTY_STATUSES } from '@exzaestate/shared';
import type { TenantPrisma } from '../../../database/tenant-prisma.js';
import { validateBookingPipeline } from '../domain/booking-validation.pipeline.js';
import type { CreateBookingDto } from '../dto/index.js';

export interface LockedPropertyRecord {
  id: string;
  status: string;
  base_price_paisa: bigint;
  premium_paisa: bigint;
  discount_limit_pct: number;
}

@Injectable()
export class BookingValidationService {
  /**
   * Enforces [RULE-BOOKING-RACE]: Locks the property row with SELECT ... FOR UPDATE
   * inside the tenant transaction and checks that no other active booking exists.
   */
  async lockAndValidateProperty(
    tx: TenantPrisma,
    companyId: string,
    propertyId: string,
  ): Promise<LockedPropertyRecord> {
    const rawProps = await tx.$queryRaw<LockedPropertyRecord[]>`
      SELECT id, status, base_price_paisa, premium_paisa, discount_limit_pct 
      FROM properties 
      WHERE id = ${propertyId}::uuid AND company_id = ${companyId}::uuid 
      FOR UPDATE
    `;

    const property = rawProps[0];
    if (!property) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: `Property "${propertyId}" not found`,
      });
    }

    const activeBooking = await tx.booking.findFirst({
      where: {
        companyId,
        propertyId,
        status: { in: [...ACTIVE_BOOKING_STATUSES] },
        deletedAt: null,
      },
      select: { id: true, bookingNumber: true },
    });

    if (activeBooking) {
      throw new ConflictException({
        code: ERROR_CODES.DUPLICATE_BOOKING,
        message: `Property already has an active booking (${activeBooking.bookingNumber})`,
      });
    }

    if (property.status !== PROPERTY_STATUSES.AVAILABLE) {
      throw new ConflictException({
        code: ERROR_CODES.DUPLICATE_BOOKING,
        message: `Property "${propertyId}" is not available for booking (status: ${property.status})`,
      });
    }

    return property;
  }

  /**
   * Validates customer and co-buyer existence.
   */
  async validateCustomers(
    tx: TenantPrisma,
    companyId: string,
    primaryCustomerId: string,
    coBuyers?: Array<{ customerId: string; sharePercentage: number }>,
  ): Promise<void> {
    const customer = await tx.customer.findFirst({
      where: { id: primaryCustomerId, companyId, deletedAt: null },
    });
    if (!customer) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: `Primary customer "${primaryCustomerId}" not found`,
      });
    }

    if (coBuyers && coBuyers.length > 0) {
      const coBuyerIds = coBuyers.map((cb) => cb.customerId);
      const count = await tx.customer.count({
        where: { id: { in: coBuyerIds }, companyId, deletedAt: null },
      });
      if (count !== coBuyerIds.length) {
        throw new BadRequestException({
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'One or more specified co-buyers do not exist in the company',
        });
      }
    }
  }

  /**
   * Validates quotation conversion integrity if quotationId is provided.
   */
  async validateQuotation(
    tx: TenantPrisma,
    companyId: string,
    quotationId: string,
    propertyId: string,
    customerId: string,
  ) {
    const quotation = await tx.quotation.findFirst({
      where: { id: quotationId, companyId, deletedAt: null },
    });
    if (!quotation) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: `Quotation "${quotationId}" not found`,
      });
    }

    if (quotation.status === 'Expired') {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Cannot convert an expired quotation into a booking',
      });
    }

    if (quotation.status === 'Rejected') {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Cannot convert a rejected quotation into a booking',
      });
    }

    if (quotation.propertyId !== propertyId) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Quotation property does not match requested booking property',
      });
    }

    if (quotation.customerId && quotation.customerId !== customerId) {
      throw new BadRequestException({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Quotation customer does not match requested booking customer',
      });
    }

    return quotation;
  }

  /**
   * Runs the complete pre-booking validation pipeline.
   */
  async runValidationPipeline(
    tx: TenantPrisma,
    companyId: string,
    dto: CreateBookingDto,
  ): Promise<{ property: LockedPropertyRecord; quotation?: unknown }> {
    const property = await this.lockAndValidateProperty(tx, companyId, dto.propertyId);
    await this.validateCustomers(tx, companyId, dto.customerId, dto.coBuyers);

    let quotation;
    if (dto.quotationId) {
      quotation = await this.validateQuotation(
        tx,
        companyId,
        dto.quotationId,
        dto.propertyId,
        dto.customerId,
      );
    }

    const basePrice = dto.basePricePaisa
      ? BigInt(dto.basePricePaisa)
      : property.base_price_paisa + property.premium_paisa;
    const discountAmount = dto.discountAmountPaisa ? BigInt(dto.discountAmountPaisa) : 0n;
    const netPrice = dto.netPricePaisa ? BigInt(dto.netPricePaisa) : basePrice - discountAmount;

    validateBookingPipeline({
      property: {
        id: property.id,
        status: property.status,
        basePricePaisa: property.base_price_paisa,
        premiumPaisa: property.premium_paisa,
        discountLimitPct: Number(property.discount_limit_pct),
      },
      primaryCustomerId: dto.customerId,
      coBuyers: dto.coBuyers,
      pricing: {
        basePricePaisa: basePrice,
        discountAmountPaisa: discountAmount,
        discountPercentage: dto.discountPercentage,
        netPricePaisa: netPrice,
      },
      hasActiveBooking: false,
    });

    return { property, quotation };
  }
}
