import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ADDRESS_TYPES, type AddressType } from '@exzaestate/shared';

export class CreateCustomerAddressDto {
  @ApiProperty({
    description: 'Address type (PRESENT, PERMANENT, OFFICE, OVERSEAS)',
    enum: Object.values(ADDRESS_TYPES),
    example: 'PRESENT',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(Object.values(ADDRESS_TYPES))
  type!: AddressType;

  @ApiProperty({ description: 'Street address line 1', example: 'House 42, Road 11, Block D' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  addressLine1!: string;

  @ApiPropertyOptional({ description: 'Street address line 2', example: 'Flat 4B, Green Villa' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  addressLine2?: string;

  @ApiProperty({ description: 'City/Thana', example: 'Banani' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  city!: string;

  @ApiPropertyOptional({ description: 'District/Division', example: 'Dhaka' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  division?: string;

  @ApiPropertyOptional({ description: 'Postal code', example: '1213' })
  @IsString()
  @IsOptional()
  @MaxLength(16)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country', default: 'Bangladesh', example: 'Bangladesh' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  country?: string;

  @ApiPropertyOptional({ description: 'Whether this is the primary address', default: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class CustomerAddressResponseDto {
  @ApiProperty({ description: 'Address UUID' })
  id!: string;

  @ApiProperty({ description: 'Customer UUID' })
  customerId!: string;

  @ApiProperty({ description: 'Address type' })
  type!: string;

  @ApiProperty({ description: 'Address line 1' })
  addressLine1!: string;

  @ApiPropertyOptional({ description: 'Address line 2' })
  addressLine2!: string | null;

  @ApiProperty({ description: 'City' })
  city!: string;

  @ApiPropertyOptional({ description: 'Division' })
  division!: string | null;

  @ApiPropertyOptional({ description: 'Postal code' })
  postalCode!: string | null;

  @ApiProperty({ description: 'Country' })
  country!: string;

  @ApiProperty({ description: 'Whether this is the primary address' })
  isPrimary!: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: string;
}
