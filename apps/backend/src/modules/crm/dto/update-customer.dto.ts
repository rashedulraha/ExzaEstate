import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { CUSTOMER_TYPES, type CustomerType } from '@exzaestate/shared';

export class UpdateCustomerDto {
  @ApiPropertyOptional({
    description: 'Customer type (INDIVIDUAL or COMPANY)',
    enum: Object.values(CUSTOMER_TYPES),
  })
  @IsString()
  @IsOptional()
  @IsIn(Object.values(CUSTOMER_TYPES))
  customerType?: CustomerType;

  @ApiPropertyOptional({ description: 'Customer full name / Company name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Father or spouse name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  fatherOrSpouseName?: string;

  @ApiPropertyOptional({ description: 'Mother name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  motherName?: string;

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be in YYYY-MM-DD format' })
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Occupation / Profession' })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  occupation?: string;

  @ApiPropertyOptional({ description: 'Nationality' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  nationality?: string;

  @ApiPropertyOptional({ description: 'Whether customer is a Non-Resident Bangladeshi (NRB)' })
  @IsBoolean()
  @IsOptional()
  isNrb?: boolean;

  @ApiPropertyOptional({ description: 'Primary phone number' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ description: 'Primary email address' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Customer profile photo URL' })
  @IsString()
  @IsOptional()
  @MaxLength(512)
  photoUrl?: string;

  @ApiPropertyOptional({ description: 'National ID number (plain text in DTO, stored encrypted)' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  nid?: string;

  @ApiPropertyOptional({ description: 'Passport number (plain text in DTO, stored encrypted)' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  passport?: string;

  @ApiPropertyOptional({ description: 'Taxpayer Identification Number (TIN)' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  tin?: string;

  @ApiPropertyOptional({ description: 'Bank account number (plain text in DTO, stored encrypted)' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  bankAccount?: string;

  @ApiPropertyOptional({ description: 'Bank name' })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank branch' })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  bankBranch?: string;

  @ApiPropertyOptional({ description: 'Bank routing number' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  bankRoutingNumber?: string;

  @ApiPropertyOptional({ description: 'Original foreign currency' })
  @IsString()
  @IsOptional()
  @MaxLength(8)
  originalCurrency?: string;

  @ApiPropertyOptional({ description: 'Remittance transaction reference' })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  remittanceReference?: string;

  @ApiPropertyOptional({ description: 'Assigned Branch UUID' })
  @IsUUID('all')
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Assigned Executive UUID' })
  @IsUUID('all')
  @IsOptional()
  assignedToId?: string;
}
