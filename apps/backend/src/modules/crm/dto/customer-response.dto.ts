import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerContactResponseDto } from './customer-contact.dto.js';
import { CustomerAddressResponseDto } from './customer-address.dto.js';
import { CustomerNomineeResponseDto } from './customer-nominee.dto.js';
import { CustomerCoBuyerResponseDto } from './customer-co-buyer.dto.js';
import { FollowUpResponseDto } from './follow-up-response.dto.js';
import { KycStatusResponseDto } from './verify-kyc.dto.js';

export class CustomerDocumentItemDto {
  @ApiProperty({ description: 'Document UUID' })
  id!: string;

  @ApiProperty({ description: 'Document title' })
  title!: string;

  @ApiPropertyOptional({ description: 'Category' })
  category!: string | null;

  @ApiProperty({ description: 'Current version number' })
  currentVersion!: number;

  @ApiProperty({ description: 'File name' })
  fileName!: string;

  @ApiProperty({ description: 'MIME type' })
  mimeType!: string;

  @ApiProperty({ description: 'Size in bytes' })
  sizeBytes!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: string;
}

export class CustomerResponseDto {
  @ApiProperty({ description: 'Customer UUID' })
  id!: string;

  @ApiProperty({ description: 'Company UUID' })
  companyId!: string;

  @ApiProperty({ description: 'Customer numbering identifier (e.g. CUST-2026-000001)' })
  customerNumber!: string;

  @ApiProperty({ description: 'Customer type (INDIVIDUAL or COMPANY)' })
  customerType!: string;

  @ApiProperty({ description: 'Customer full name / Company name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Father or spouse name' })
  fatherOrSpouseName!: string | null;

  @ApiPropertyOptional({ description: 'Mother name' })
  motherName!: string | null;

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)' })
  dateOfBirth!: string | null;

  @ApiPropertyOptional({ description: 'Occupation' })
  occupation!: string | null;

  @ApiProperty({ description: 'Nationality' })
  nationality!: string;

  @ApiProperty({ description: 'Whether customer is a Non-Resident Bangladeshi (NRB)' })
  isNrb!: boolean;

  @ApiProperty({ description: 'Primary phone number' })
  phone!: string;

  @ApiPropertyOptional({ description: 'Primary email address' })
  email!: string | null;

  @ApiPropertyOptional({ description: 'Profile photo URL' })
  photoUrl!: string | null;

  // Sensitive PII - Masked unless customer:view-pii is held
  @ApiPropertyOptional({ description: 'National ID (masked unless permitted)' })
  nid!: string | null;

  @ApiPropertyOptional({ description: 'Passport number (masked unless permitted)' })
  passport!: string | null;

  @ApiPropertyOptional({ description: 'TIN (masked unless permitted)' })
  tin!: string | null;

  @ApiPropertyOptional({ description: 'Bank account number (masked unless permitted)' })
  bankAccount!: string | null;

  @ApiPropertyOptional({ description: 'Bank name' })
  bankName!: string | null;

  @ApiPropertyOptional({ description: 'Bank branch' })
  bankBranch!: string | null;

  @ApiPropertyOptional({ description: 'Bank routing number' })
  bankRoutingNumber!: string | null;

  // Foreign remittance fields (NRB)
  @ApiPropertyOptional({ description: 'Original foreign currency' })
  originalCurrency!: string | null;

  @ApiPropertyOptional({ description: 'Remittance reference' })
  remittanceReference!: string | null;

  // KYC status
  @ApiProperty({ description: 'Whether KYC is marked as complete' })
  isKycCompleted!: boolean;

  @ApiPropertyOptional({ description: 'Timestamp when KYC was completed' })
  kycCompletedAt!: string | null;

  @ApiPropertyOptional({ description: 'Officer user UUID who completed KYC' })
  kycCompletedById!: string | null;

  @ApiPropertyOptional({ description: 'KYC notes' })
  kycNotes!: string | null;

  // Scoping & relations
  @ApiPropertyOptional({ description: 'Source CRM Lead UUID' })
  leadId!: string | null;

  @ApiPropertyOptional({ description: 'Assigned Branch UUID' })
  branchId!: string | null;

  @ApiPropertyOptional({ description: 'Assigned Executive UUID' })
  assignedToId!: string | null;

  @ApiPropertyOptional({ description: 'Creator user UUID' })
  createdById!: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt!: string;
}

export class CustomerDetailResponseDto extends CustomerResponseDto {
  @ApiProperty({ description: 'Secondary contacts', type: [CustomerContactResponseDto] })
  contacts!: CustomerContactResponseDto[];

  @ApiProperty({ description: 'Customer addresses', type: [CustomerAddressResponseDto] })
  addresses!: CustomerAddressResponseDto[];

  @ApiProperty({ description: 'Customer nominees', type: [CustomerNomineeResponseDto] })
  nominees!: CustomerNomineeResponseDto[];

  @ApiProperty({
    description: 'Customer co-buyers / joint buyers',
    type: [CustomerCoBuyerResponseDto],
  })
  coBuyers!: CustomerCoBuyerResponseDto[];

  @ApiProperty({ description: 'Attached documents', type: [CustomerDocumentItemDto] })
  documents!: CustomerDocumentItemDto[];

  @ApiProperty({ description: 'Associated follow-ups', type: [FollowUpResponseDto] })
  followUps!: FollowUpResponseDto[];

  @ApiProperty({ description: 'Detailed KYC compliance evaluation' })
  kycStatus!: KycStatusResponseDto;
}
