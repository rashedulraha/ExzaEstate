import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CUSTOMER_TYPES, type CustomerType } from '@exzaestate/shared';
import { CreateCustomerContactDto } from './customer-contact.dto.js';
import { CreateCustomerAddressDto } from './customer-address.dto.js';
import { CreateCustomerNomineeDto } from './customer-nominee.dto.js';
import { CreateCustomerCoBuyerDto } from './customer-co-buyer.dto.js';

export class CreateCustomerDto {
  @ApiPropertyOptional({
    description: 'Customer type (INDIVIDUAL or COMPANY)',
    enum: Object.values(CUSTOMER_TYPES),
    default: 'INDIVIDUAL',
  })
  @IsString()
  @IsOptional()
  @IsIn(Object.values(CUSTOMER_TYPES))
  customerType?: CustomerType;

  @ApiProperty({ description: 'Customer full name / Company name', example: 'Mahmudur Rahman' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Father or spouse name', example: 'Late Fazlur Rahman' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  fatherOrSpouseName?: string;

  @ApiPropertyOptional({ description: 'Mother name', example: 'Rokeya Begum' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  motherName?: string;

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)', example: '1982-05-14' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth must be in YYYY-MM-DD format' })
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Occupation / Profession', example: 'Civil Engineer' })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  occupation?: string;

  @ApiPropertyOptional({
    description: 'Nationality',
    default: 'Bangladeshi',
    example: 'Bangladeshi',
  })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  nationality?: string;

  @ApiPropertyOptional({
    description: 'Whether customer is a Non-Resident Bangladeshi (NRB)',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isNrb?: boolean;

  @ApiProperty({ description: 'Primary phone number', example: '+8801712345678' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone!: string;

  @ApiPropertyOptional({
    description: 'Primary email address',
    example: 'mahmud.rahman@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Customer profile photo URL' })
  @IsString()
  @IsOptional()
  @MaxLength(512)
  photoUrl?: string;

  // Sensitive PII fields - Plain text in input DTO, encrypted at rest via FieldCrypto
  @ApiPropertyOptional({
    description: 'National ID number (plain text, stored encrypted)',
    example: '19821234567890',
  })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  nid?: string;

  @ApiPropertyOptional({
    description: 'Passport number (plain text, stored encrypted)',
    example: 'BW0897654',
  })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  passport?: string;

  @ApiPropertyOptional({
    description: 'Taxpayer Identification Number (TIN)',
    example: '123456789012',
  })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  tin?: string;

  @ApiPropertyOptional({
    description: 'Bank account number (plain text, stored encrypted)',
    example: '2050123456789',
  })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  bankAccount?: string;

  @ApiPropertyOptional({ description: 'Bank name', example: 'Islami Bank Bangladesh Ltd' })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank branch', example: 'Gulshan Branch' })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  bankBranch?: string;

  @ApiPropertyOptional({ description: 'Bank routing number', example: '125261789' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  bankRoutingNumber?: string;

  // Foreign remittance fields (NRB)
  @ApiPropertyOptional({
    description: 'Original foreign currency (e.g. USD, GBP, AED)',
    example: 'USD',
  })
  @IsString()
  @IsOptional()
  @MaxLength(8)
  originalCurrency?: string;

  @ApiPropertyOptional({
    description: 'Remittance transaction reference / bank code',
    example: 'REMIT-2026-9988',
  })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  remittanceReference?: string;

  // Scoping & relations
  @ApiPropertyOptional({ description: 'Source CRM Lead UUID if converted' })
  @IsUUID('all')
  @IsOptional()
  leadId?: string;

  @ApiPropertyOptional({ description: 'Assigned Branch UUID' })
  @IsUUID('all')
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Assigned Executive UUID' })
  @IsUUID('all')
  @IsOptional()
  assignedToId?: string;

  // Nested collections
  @ApiPropertyOptional({ description: 'Secondary contacts', type: [CreateCustomerContactDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerContactDto)
  @IsOptional()
  contacts?: CreateCustomerContactDto[];

  @ApiPropertyOptional({ description: 'Customer addresses', type: [CreateCustomerAddressDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerAddressDto)
  @IsOptional()
  addresses?: CreateCustomerAddressDto[];

  @ApiPropertyOptional({ description: 'Customer nominees', type: [CreateCustomerNomineeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerNomineeDto)
  @IsOptional()
  nominees?: CreateCustomerNomineeDto[];

  @ApiPropertyOptional({
    description: 'Customer co-buyers / joint buyers',
    type: [CreateCustomerCoBuyerDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerCoBuyerDto)
  @IsOptional()
  coBuyers?: CreateCustomerCoBuyerDto[];
}
