import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateBudgetDto {
  @ApiPropertyOptional({ description: 'Project ID (UUID) if project-specific' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Category ID (UUID) if category-specific' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ description: 'Fiscal Year', example: '2026-2027' })
  @IsString()
  @IsNotEmpty()
  fiscalYear!: string;

  @ApiProperty({ description: 'Budget amount in paisa', example: '100000000' })
  @IsString()
  @IsNotEmpty()
  budgetAmountPaisa!: string;
}
