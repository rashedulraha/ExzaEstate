import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class VersionAgreementDto {
  @ApiProperty({
    example: 'Client requested amendment to milestone clause 4',
    description: 'Mandatory reason for new version',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional({
    example: 'Amended Agreement for Allotment & Sale',
    description: 'Title of new agreement version',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'New legal content (if omitted, copies from existing agreement)',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'New custom terms' })
  @IsString()
  @IsOptional()
  terms?: string;

  @ApiPropertyOptional({ description: 'Internal remarks' })
  @IsString()
  @IsOptional()
  notes?: string;
}
