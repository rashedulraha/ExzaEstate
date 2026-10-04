import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class RequestApprovalDto {
  @ApiProperty({
    description: 'Approval type categorization',
    example: 'DISCOUNT',
  })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({
    description: 'Descriptive title for the approval inbox item',
    example: 'Approval requested for 6.5% discount on Unit A-401',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({
    description: 'Detailed description or justification for the approval',
    example: 'Client requested special corporate price concession',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Target entity type',
    example: 'Quotation',
  })
  @IsString()
  @IsOptional()
  entityType?: string;

  @ApiPropertyOptional({
    description: 'Target entity UUID',
  })
  @IsUUID('all')
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({
    description: 'Project UUID for location-scoped rules',
  })
  @IsUUID('all')
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Branch UUID for branch-scoped rules',
  })
  @IsUUID('all')
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Monetary amount in paisa relevant to the approval rule threshold',
    example: '25000000',
  })
  @IsNumberString()
  @IsOptional()
  amountPaisa?: string;

  @ApiPropertyOptional({
    description: 'Percentage relevant to discount or commission rules',
    example: 6.5,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  percentage?: number;

  @ApiProperty({
    description: 'Immutable action payload required to resume and execute upon final approval',
  })
  @IsObject()
  payload!: Record<string, unknown>;
}
