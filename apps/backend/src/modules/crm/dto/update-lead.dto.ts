import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateLeadDto {
  @ApiPropertyOptional({ description: "Lead's full name", example: 'Kamal Hossain' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Primary contact phone', example: '+8801712345678' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address', example: 'kamal@example.com' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Lead generation source', example: 'Facebook' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  source?: string;

  @ApiPropertyOptional({ description: 'Preferred project UUID' })
  @IsUUID('all')
  @IsOptional()
  preferredProjectId?: string;

  @ApiPropertyOptional({ description: 'Preferred property type', example: 'PLOT' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  preferredPropertyType?: string;

  @ApiPropertyOptional({ description: 'Estimated budget in paisa', example: '500000000' })
  @IsNumberString()
  @IsOptional()
  budgetPaisa?: string;

  @ApiPropertyOptional({ description: 'Interest description and notes' })
  @IsString()
  @IsOptional()
  interestNotes?: string;

  @ApiPropertyOptional({
    description: 'Bypass duplicate phone check warning if true',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  allowDuplicate?: boolean;

  @ApiPropertyOptional({ description: 'Branch UUID assignment' })
  @IsUUID('all')
  @IsOptional()
  branchId?: string;
}
