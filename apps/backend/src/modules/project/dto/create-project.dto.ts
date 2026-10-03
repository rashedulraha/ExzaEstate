import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ description: 'Name of the project', example: 'Purbachal Green City Phase 1' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Unique project code', example: 'PRJ-PUR-001' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({
    description: 'Project type (e.g. RESIDENTIAL, COMMERCIAL, LAND_DEVELOPMENT, MIXED_USE)',
    example: 'RESIDENTIAL',
  })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiPropertyOptional({
    description:
      'Project status (PLANNING, IN_PROGRESS, UNDER_CONSTRUCTION, HANDOVER, COMPLETED, ON_HOLD, CANCELLED)',
    example: 'PLANNING',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Linked land parcel ID (UUID)' })
  @IsUUID()
  @IsOptional()
  landId?: string;

  @ApiPropertyOptional({ description: 'Assigned Project Manager User ID (UUID)' })
  @IsUUID()
  @IsOptional()
  projectManagerId?: string;

  @ApiPropertyOptional({ description: 'General location name', example: 'Sector 4, Purbachal' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'District', example: 'Gazipur' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ description: 'Upazila / Thana', example: 'Kaliganj' })
  @IsString()
  @IsOptional()
  upazila?: string;

  @ApiPropertyOptional({ description: 'Detailed project address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Project start date (YYYY-MM-DD)', example: '2025-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Target completion date (YYYY-MM-DD)',
    example: '2028-12-31',
  })
  @IsDateString()
  @IsOptional()
  expectedCompletionDate?: string;

  @ApiPropertyOptional({ description: 'Actual end date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'URL for master plan diagram / document' })
  @IsString()
  @IsOptional()
  masterPlanUrl?: string;

  @ApiPropertyOptional({ description: 'Gallery image URLs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  galleryUrls?: string[];

  @ApiPropertyOptional({ description: 'Project description or marketing summary' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Estimated budget in integer paisa', example: '50000000000' })
  @IsOptional()
  estimatedBudgetPaisa?: string | number;

  @ApiPropertyOptional({
    description: 'Custom cost center code (default: CC-{code})',
    example: 'CC-PUR-001',
  })
  @IsString()
  @IsOptional()
  costCenterCode?: string;

  @ApiPropertyOptional({ description: 'Custom cost center name (default: {name} Cost Center)' })
  @IsString()
  @IsOptional()
  costCenterName?: string;
}
