import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ConvertLeadDto {
  @ApiPropertyOptional({
    description: 'Customer classification type',
    enum: ['INDIVIDUAL', 'COMPANY'],
    default: 'INDIVIDUAL',
  })
  @IsOptional()
  @IsEnum(['INDIVIDUAL', 'COMPANY'])
  customerType?: 'INDIVIDUAL' | 'COMPANY';

  @ApiPropertyOptional({ description: 'Optional name override; defaults to lead name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Optional email override; defaults to lead email' })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ description: 'Father or spouse name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fatherOrSpouseName?: string;

  @ApiPropertyOptional({ description: 'Mother name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  motherName?: string;

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Occupation or profession' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  occupation?: string;

  @ApiPropertyOptional({ description: 'Nationality', default: 'Bangladeshi' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  nationality?: string;

  @ApiPropertyOptional({ description: 'Non-Resident Bangladeshi (NRB) flag', default: false })
  @IsOptional()
  @IsBoolean()
  isNrb?: boolean;

  @ApiPropertyOptional({ description: 'Profile photograph URL or document ID' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'Bangladeshi 10, 13, or 17 digit NID (encrypted at rest)' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  nid?: string;

  @ApiPropertyOptional({ description: 'Passport number (encrypted at rest)' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  passport?: string;

  @ApiPropertyOptional({ description: 'e-TIN certificate number (encrypted at rest)' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  tin?: string;

  @ApiPropertyOptional({ description: 'Bank account number (encrypted at rest)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank branch name' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  bankBranch?: string;

  @ApiPropertyOptional({ description: 'Bank routing number' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  bankRoutingNumber?: string;

  @ApiPropertyOptional({ description: 'Primary present address line 1' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine1?: string;

  @ApiPropertyOptional({ description: 'Primary present address line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiPropertyOptional({ description: 'City (e.g. Dhaka, Chittagong)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  city?: string;

  @ApiPropertyOptional({ description: 'Division (e.g. Dhaka Division)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  division?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country', default: 'Bangladesh' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  country?: string;

  @ApiPropertyOptional({
    description: 'Optional conversion reason or notes recorded in lead history',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
