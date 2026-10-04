import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVendorDto {
  @ApiProperty({ description: 'Vendor business name', example: 'Eastern Cement & Steel' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ description: 'Contact person name' })
  @IsString()
  @IsOptional()
  contactPerson?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Business address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Trade License Number' })
  @IsString()
  @IsOptional()
  tradeLicenseNo?: string;

  @ApiPropertyOptional({ description: 'Taxpayer Identification Number (TIN)' })
  @IsString()
  @IsOptional()
  tin?: string;

  @ApiPropertyOptional({ description: 'Business Identification Number (BIN / VAT Reg)' })
  @IsString()
  @IsOptional()
  bin?: string;

  @ApiPropertyOptional({ description: 'Bank Name' })
  @IsString()
  @IsOptional()
  bankName?: string;

  @ApiPropertyOptional({ description: 'Bank Branch' })
  @IsString()
  @IsOptional()
  bankBranch?: string;

  @ApiPropertyOptional({ description: 'Bank Account Number (stored encrypted)' })
  @IsString()
  @IsOptional()
  bankAccountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank Routing Number' })
  @IsString()
  @IsOptional()
  routingNumber?: string;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
