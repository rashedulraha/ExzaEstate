import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateApprovalRuleDto {
  @ApiProperty({
    description: 'Approval rule category type',
    example: 'DISCOUNT',
  })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({
    description: 'Descriptive human-readable rule name',
    example: 'Custom Branch Discount Ceiling',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Detailed description or justification for this rule',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Minimum monetary threshold in paisa',
    example: '0',
  })
  @IsNumberString()
  @IsOptional()
  minAmountPaisa?: string;

  @ApiPropertyOptional({
    description: 'Maximum monetary threshold in paisa (null if unbounded)',
    example: '50000000',
  })
  @IsNumberString()
  @IsOptional()
  maxAmountPaisa?: string;

  @ApiPropertyOptional({
    description: 'Minimum percentage threshold',
    example: 0.01,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  minPercentage?: number;

  @ApiPropertyOptional({
    description: 'Maximum percentage threshold',
    example: 2.0,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  maxPercentage?: number;

  @ApiPropertyOptional({
    description: 'Optional Project UUID scope',
  })
  @IsUUID('all')
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Optional Branch UUID scope',
  })
  @IsUUID('all')
  @IsOptional()
  branchId?: string;

  @ApiProperty({
    description: 'Permission required by approver to clear this rule step',
    example: 'discount:approve-tier1',
  })
  @IsString()
  @IsNotEmpty()
  requiredPermission!: string;

  @ApiPropertyOptional({
    description: 'Order in multi-step sequence',
    default: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  stepOrder?: number = 1;

  @ApiPropertyOptional({
    description: 'Service Level Agreement hours for step completion reminder',
    default: 24,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  slaHours?: number = 24;

  @ApiPropertyOptional({
    description: 'Whether the rule is active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

export class UpdateApprovalRuleDto {
  @ApiPropertyOptional({
    description: 'Updated rule name',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated rule description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated required permission',
  })
  @IsString()
  @IsOptional()
  requiredPermission?: string;

  @ApiPropertyOptional({
    description: 'Updated SLA hours',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  slaHours?: number;

  @ApiPropertyOptional({
    description: 'Updated active flag',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
