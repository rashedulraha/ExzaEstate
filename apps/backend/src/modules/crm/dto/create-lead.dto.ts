import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateLeadDto {
  @ApiProperty({ description: "Lead's full name", example: 'Kamal Hossain' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Primary contact phone', example: '+8801712345678' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone!: string;

  @ApiPropertyOptional({ description: 'Email address', example: 'kamal@example.com' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiProperty({
    description: 'Lead generation source',
    example: 'Facebook',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  source!: string;

  @ApiPropertyOptional({ description: 'Preferred project UUID' })
  @IsUUID('all')
  @IsOptional()
  preferredProjectId?: string;

  @ApiPropertyOptional({
    description: 'Preferred property type (PLOT, FLAT, etc.)',
    example: 'PLOT',
  })
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

  @ApiPropertyOptional({ description: 'Assigned Sales Executive user UUID' })
  @IsUUID('all')
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Branch UUID' })
  @IsUUID('all')
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Bypass duplicate phone check warning if true',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  allowDuplicate?: boolean;
}
