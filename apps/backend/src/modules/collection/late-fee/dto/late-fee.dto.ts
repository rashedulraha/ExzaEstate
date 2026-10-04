import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ChargeLateFeeDto {
  @ApiPropertyOptional({ example: '2026-03-15' })
  @IsOptional()
  @IsString()
  asOfDate?: string;

  @ApiPropertyOptional({ example: 2, description: 'Override monthly rate percentage (e.g. 2%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  ratePct?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  graceDays?: number;
}

export class WaiveLateFeeDto {
  @ApiProperty({ example: 'Approved customer hardship relief by MD' })
  @IsString()
  reason!: string;
}

export class LateFeeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  installmentId!: string;

  @ApiProperty({ example: '1000000' })
  amountPaisa!: string;

  @ApiProperty({ example: '৳10,000.00' })
  amountFormatted!: string;

  @ApiProperty()
  isWaived!: boolean;

  @ApiPropertyOptional()
  waivedAt?: string | null;

  @ApiPropertyOptional()
  waivedById?: string | null;

  @ApiPropertyOptional()
  journalId?: string | null;

  @ApiProperty()
  createdAt!: string;
}
