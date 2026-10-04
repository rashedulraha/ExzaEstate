import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class GenerateAgreementDto {
  @ApiProperty({ description: 'ID of the confirmed booking', format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  bookingId!: string;

  @ApiPropertyOptional({
    description: 'Specific template ID to use (falls back to default)',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  templateId?: string;

  @ApiPropertyOptional({
    example: 'Agreement for Allotment & Sale',
    description: 'Agreement title',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    example: 'Possession within 36 months of confirmation',
    description: 'Custom agreement terms',
  })
  @IsString()
  @IsOptional()
  terms?: string;

  @ApiPropertyOptional({
    description: 'Explicit legal content override if bypassing template rendering',
  })
  @IsString()
  @IsOptional()
  customContent?: string;
}
