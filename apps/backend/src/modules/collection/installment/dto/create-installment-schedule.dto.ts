import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CustomMilestoneDto {
  @ApiProperty({ example: 'Roof Casting Complete' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: '50000000', description: 'Paisa amount as string' })
  @IsOptional()
  @IsString()
  amountPaisa?: string;

  @ApiPropertyOptional({ example: 10, description: 'Percentage of remaining amount' })
  @IsOptional()
  @IsNumber()
  percentage?: number;

  @ApiPropertyOptional({ example: '2026-12-15' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'ROOF_CASTING' })
  @IsOptional()
  @IsString()
  milestoneEvent?: string;
}

export class GenerateScheduleDto {
  @ApiProperty({ format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  bookingId!: string;

  @ApiProperty({ example: '2026-11-01', description: 'First installment due date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  firstDueDate!: string;

  @ApiPropertyOptional({ example: 24, default: 24 })
  @IsOptional()
  @IsInt()
  @Min(1)
  installmentCount?: number;

  @ApiPropertyOptional({
    enum: ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'],
    default: 'MONTHLY',
  })
  @IsOptional()
  @IsEnum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'])
  frequency?: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';

  @ApiPropertyOptional({ type: [CustomMilestoneDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomMilestoneDto)
  customMilestones?: CustomMilestoneDto[];
}
