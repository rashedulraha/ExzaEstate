import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateAccountDto {
  @ApiPropertyOptional({ description: 'Updated account code', example: '1022' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  code?: string;

  @ApiPropertyOptional({ description: 'Updated account name', example: 'City Bank Gulshan Branch' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  name?: string;

  @ApiPropertyOptional({ description: 'Parent account ID for hierarchy' })
  @IsOptional()
  @IsUUID('7')
  parentId?: string | null;

  @ApiPropertyOptional({
    description: 'Account active flag (system accounts cannot be deactivated)',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Account description' })
  @IsOptional()
  @IsString()
  description?: string;
}
