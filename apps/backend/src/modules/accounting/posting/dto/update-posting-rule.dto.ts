import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePostingRuleDto {
  @ApiPropertyOptional({
    description: 'Display name for the rule',
    example: 'Booking Confirmation',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  ruleName?: string;

  @ApiPropertyOptional({ description: 'Detailed description of the rule' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Default debit account 4-digit code', example: '1100' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  debitAccountCode?: string;

  @ApiPropertyOptional({ description: 'Default credit account 4-digit code', example: '4100' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  creditAccountCode?: string;

  @ApiPropertyOptional({
    description: 'Custom account role mappings (e.g. { receivable: "1100", revenue: "4100" })',
    example: { receivable: '1100', revenue: '4100' },
  })
  @IsOptional()
  @IsObject()
  accountMappings?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Whether the rule is actively enforced', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
