import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCustomerNomineeDto {
  @ApiProperty({ description: 'Nominee full name', example: 'Tariqul Islam' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Relationship to customer', example: 'SON' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  relationship!: string;

  @ApiPropertyOptional({ description: 'Contact phone number', example: '+8801811223344' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ description: 'Contact email', example: 'tariqul.islam@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'National ID number (plain text in DTO, stored encrypted)',
    example: '19951234567890',
  })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  nid?: string;

  @ApiPropertyOptional({
    description: 'Residential address',
    example: 'House 12, Road 4, Dhanmondi, Dhaka',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Photo URL' })
  @IsString()
  @IsOptional()
  @MaxLength(512)
  photoUrl?: string;

  @ApiPropertyOptional({
    description: 'Nominee share percentage (0.01 - 100.00)',
    default: 100,
    example: 100,
  })
  @IsNumber()
  @Min(0.01)
  @Max(100)
  @IsOptional()
  sharePercentage?: number;

  @ApiPropertyOptional({
    description: 'Whether this nominee is a Power of Attorney holder',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPowerOfAttorney?: boolean;

  @ApiPropertyOptional({
    description: 'Power of Attorney document / deed number',
    example: 'POA-DHK-2026-088',
  })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  poaDocumentNumber?: string;
}

export class CustomerNomineeResponseDto {
  @ApiProperty({ description: 'Nominee UUID' })
  id!: string;

  @ApiProperty({ description: 'Customer UUID' })
  customerId!: string;

  @ApiProperty({ description: 'Nominee full name' })
  name!: string;

  @ApiProperty({ description: 'Relationship to customer' })
  relationship!: string;

  @ApiPropertyOptional({ description: 'Contact phone' })
  phone!: string | null;

  @ApiPropertyOptional({ description: 'Contact email' })
  email!: string | null;

  @ApiPropertyOptional({ description: 'National ID (masked unless permitted)' })
  nid!: string | null;

  @ApiPropertyOptional({ description: 'Residential address' })
  address!: string | null;

  @ApiPropertyOptional({ description: 'Photo URL' })
  photoUrl!: string | null;

  @ApiProperty({ description: 'Share percentage' })
  sharePercentage!: number;

  @ApiProperty({ description: 'Whether holder of Power of Attorney' })
  isPowerOfAttorney!: boolean;

  @ApiPropertyOptional({ description: 'Power of Attorney document number' })
  poaDocumentNumber!: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: string;
}
