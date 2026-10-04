import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCustomerCoBuyerDto {
  @ApiProperty({ description: 'Co-buyer full name', example: 'Nasreen Akter' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Relationship to primary customer', example: 'SPOUSE' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  relationship?: string;

  @ApiProperty({ description: 'Co-buyer phone number', example: '+8801911223344' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone!: string;

  @ApiPropertyOptional({ description: 'Co-buyer email', example: 'nasreen.akter@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'National ID number (plain text in DTO, stored encrypted)',
    example: '19851234567890',
  })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  nid?: string;

  @ApiPropertyOptional({
    description: 'Co-buyer share percentage (0.01 - 100.00)',
    default: 50,
    example: 50,
  })
  @IsNumber()
  @Min(0.01)
  @Max(100)
  @IsOptional()
  sharePercentage?: number;

  @ApiPropertyOptional({
    description: 'Optional link to existing Customer UUID if already registered',
  })
  @IsUUID('all')
  @IsOptional()
  coBuyerCustomerId?: string;
}

export class CustomerCoBuyerResponseDto {
  @ApiProperty({ description: 'Co-buyer UUID' })
  id!: string;

  @ApiProperty({ description: 'Primary customer UUID' })
  primaryCustomerId!: string;

  @ApiPropertyOptional({ description: 'Linked customer UUID if registered' })
  coBuyerCustomerId!: string | null;

  @ApiProperty({ description: 'Co-buyer full name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Relationship to primary customer' })
  relationship!: string | null;

  @ApiProperty({ description: 'Phone number' })
  phone!: string;

  @ApiPropertyOptional({ description: 'Email address' })
  email!: string | null;

  @ApiPropertyOptional({ description: 'National ID (masked unless permitted)' })
  nid!: string | null;

  @ApiProperty({ description: 'Share percentage' })
  sharePercentage!: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: string;
}
