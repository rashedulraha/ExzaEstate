import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAgreementTemplateDto {
  @ApiProperty({ example: 'ALLOTMENT_STD', description: 'Unique code for the template' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty({
    example: 'Standard Property Allotment Agreement',
    description: 'Template display name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    example:
      'This Agreement is made on {{booking_date}} between {{company_name}} and {{customer_name}}...',
    description: 'Template legal body text with placeholders',
  })
  @IsString()
  @IsNotEmpty()
  templateBody!: string;

  @ApiPropertyOptional({ example: true, description: 'Whether this is the default template' })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Whether template is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
