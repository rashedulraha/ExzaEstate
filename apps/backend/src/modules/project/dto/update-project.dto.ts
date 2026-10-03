import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: 'Name of the project' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Unique project code' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: 'Project type' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Project status' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Linked land parcel ID (UUID)' })
  @IsUUID()
  @IsOptional()
  landId?: string | null;

  @ApiPropertyOptional({ description: 'Assigned Project Manager User ID (UUID)' })
  @IsUUID()
  @IsOptional()
  projectManagerId?: string | null;

  @ApiPropertyOptional({ description: 'General location name' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'District' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiPropertyOptional({ description: 'Upazila / Thana' })
  @IsString()
  @IsOptional()
  upazila?: string;

  @ApiPropertyOptional({ description: 'Detailed project address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Project start date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Target completion date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  expectedCompletionDate?: string;

  @ApiPropertyOptional({ description: 'Actual end date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'URL for master plan diagram' })
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

  @ApiPropertyOptional({ description: 'Estimated budget in integer paisa' })
  @IsOptional()
  estimatedBudgetPaisa?: string | number;
}
