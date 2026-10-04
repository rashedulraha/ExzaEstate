import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { CANONICAL_PROPERTY_STATUSES, type CanonicalPropertyStatus } from './query-property.dto.js';

export class StatusOverrideDto {
  @ApiProperty({
    description: 'Target status to force override',
    enum: CANONICAL_PROPERTY_STATUSES,
    example: 'Available',
  })
  @IsIn(CANONICAL_PROPERTY_STATUSES)
  @IsNotEmpty()
  targetStatus!: CanonicalPropertyStatus;

  @ApiProperty({
    description: 'Mandatory audited business justification for manual override',
    example: 'Management approved manual correction after cancellation discrepancy',
  })
  @IsString()
  @IsNotEmpty({ message: 'Reason is mandatory for status override' })
  @MinLength(5, { message: 'Reason must be at least 5 characters long' })
  reason!: string;
}

export class HoldPropertyDto {
  @ApiPropertyOptional({
    description: 'Optional ISO timestamp when the hold automatically expires',
    example: '2026-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  holdExpiresAt?: string;

  @ApiPropertyOptional({
    description: 'Reason for putting the unit on management hold',
    example: 'Reserved for VIP prospective buyer review',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class BlockPropertyDto {
  @ApiProperty({
    description: 'Mandatory business reason for blocking unit from sale',
    example: 'Legal dispute pending or reserved for landowner partition',
  })
  @IsString()
  @IsNotEmpty({ message: 'Reason is mandatory for blocking a property' })
  @MinLength(3, { message: 'Reason must be at least 3 characters long' })
  reason!: string;
}
