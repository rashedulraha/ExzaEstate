import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCommissionRuleDto {
  @ApiProperty({ description: 'Rule name', example: 'Standard Broker 2%' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Project ID (UUID) if project-specific' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Calculation type',
    enum: ['PERCENT_NET_PRICE', 'FIXED_AMOUNT', 'PERCENT_COLLECTED'],
    default: 'PERCENT_NET_PRICE',
  })
  @IsIn(['PERCENT_NET_PRICE', 'FIXED_AMOUNT', 'PERCENT_COLLECTED'])
  @IsOptional()
  calculationType?: string;

  @ApiPropertyOptional({ description: 'Percentage rate (e.g. 2.00 for 2%)', example: 2.0 })
  @IsNumber()
  @IsOptional()
  percentage?: number;

  @ApiPropertyOptional({ description: 'Fixed amount in paisa', example: '10000000' })
  @IsString()
  @IsOptional()
  fixedAmountPaisa?: string;

  @ApiPropertyOptional({
    description: 'Trigger event',
    enum: ['ON_CONFIRMED', 'ON_AGREEMENT', 'ON_COLLECTION_PCT'],
    default: 'ON_CONFIRMED',
  })
  @IsIn(['ON_CONFIRMED', 'ON_AGREEMENT', 'ON_COLLECTION_PCT'])
  @IsOptional()
  triggerEvent?: string;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
