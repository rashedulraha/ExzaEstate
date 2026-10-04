import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@exzaestate/shared';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator.js';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import type {
  BookingResponseDto,
  CancelBookingDto,
  CreateBookingDto,
  QueryBookingsDto,
} from '../dto/index.js';
import {
  ReservationExpiryService,
  type ReservationExpiryResult,
} from './jobs/reservation-expiry.service.js';
import { BookingService } from './booking.service.js';

@ApiTags('Sales - Bookings')
@ApiBearerAuth()
@Controller('sales/bookings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly reservationExpiryService: ReservationExpiryService,
  ) {}

  @Post()
  @RequirePermission(PERMISSIONS.BOOKING_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new property booking with atomic row lock (idempotent)' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Unique client-supplied key for retry-safe idempotency',
  })
  async createBooking(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateBookingDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<BookingResponseDto> {
    return this.bookingService.createBooking(companyId, userId, dto, idempotencyKey);
  }

  @Get()
  @RequirePermission(PERMISSIONS.BOOKING_VIEW)
  @ApiOperation({ summary: 'List and filter bookings with pagination' })
  async listBookings(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryBookingsDto,
  ): Promise<{ items: BookingResponseDto[]; total: number; page: number; limit: number }> {
    return this.bookingService.listBookings(companyId, query);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.BOOKING_VIEW)
  @ApiOperation({ summary: 'Get single booking details by ID' })
  async getBooking(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ): Promise<BookingResponseDto> {
    return this.bookingService.getBooking(companyId, id);
  }

  @Post('process-expirations')
  @RequirePermission(PERMISSIONS.BOOKING_CANCEL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process reservation hold expirations for unfunded bookings and release properties',
  })
  async processExpirations(
    @CurrentUser('companyId') companyId: string,
  ): Promise<ReservationExpiryResult> {
    return this.reservationExpiryService.processCompanyExpirations(companyId);
  }

  @Post(':id/cancel')
  @RequirePermission(PERMISSIONS.BOOKING_CANCEL)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel booking and release property per policy' })
  async cancelBooking(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingService.cancelBooking(companyId, userId, id, dto);
  }
}
