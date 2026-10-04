import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class BookingCoBuyerDto {
  @ApiProperty({ description: 'Customer ID of the co-buyer' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ description: 'Ownership percentage share (1 to 100)' })
  @IsNumber()
  @Min(0.01)
  @Max(100.0)
  sharePercentage!: number;
}

export class CreateBookingDto {
  @ApiProperty({ description: 'Property ID to book' })
  @IsUUID()
  propertyId!: string;

  @ApiProperty({ description: 'Primary customer ID' })
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional({ description: 'Source CRM Lead ID' })
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @ApiPropertyOptional({ description: 'Quotation ID to convert from' })
  @IsOptional()
  @IsUUID()
  quotationId?: string;

  @ApiPropertyOptional({ description: 'Sales Executive ID responsible for the booking' })
  @IsOptional()
  @IsUUID()
  salesExecutiveId?: string;

  @ApiPropertyOptional({ description: 'Broker/Agent ID' })
  @IsOptional()
  @IsUUID()
  brokerId?: string;

  @ApiPropertyOptional({ description: 'Base price in paisa' })
  @IsOptional()
  @IsString()
  basePricePaisa?: string;

  @ApiPropertyOptional({ description: 'Discount amount in paisa' })
  @IsOptional()
  @IsString()
  discountAmountPaisa?: string;

  @ApiPropertyOptional({ description: 'Discount percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiPropertyOptional({ description: 'Net price in paisa' })
  @IsOptional()
  @IsString()
  netPricePaisa?: string;

  @ApiPropertyOptional({ description: 'Payment plan template ID' })
  @IsOptional()
  @IsUUID()
  paymentPlanTemplateId?: string;

  @ApiPropertyOptional({ description: 'Reservation hold hours (default 72)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(720)
  reservationHoldHours?: number;

  @ApiPropertyOptional({ description: 'Additional joint co-buyers' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingCoBuyerDto)
  coBuyers?: BookingCoBuyerDto[];

  @ApiPropertyOptional({ description: 'Optional booking notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Optional booking terms' })
  @IsOptional()
  @IsString()
  terms?: string;
}
