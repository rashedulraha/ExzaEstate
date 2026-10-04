import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category code', example: 'EXP_OFFICE' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ description: 'Category name', example: 'Office Supplies & Stationery' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'COA Account code', example: '5500', default: '5500' })
  @IsString()
  @IsOptional()
  accountCode?: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Is active flag', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
