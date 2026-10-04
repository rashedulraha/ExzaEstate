import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class BudgetQueryDto {
  @ApiPropertyOptional({ description: 'Filter by fiscal year' })
  @IsString()
  @IsOptional()
  fiscalYear?: string;

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;
}
