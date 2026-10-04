import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCustomerContactDto {
  @ApiProperty({ description: 'Contact full name', example: 'Ayesha Rahman' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Relationship to customer', example: 'SPOUSE' })
  @IsString()
  @IsOptional()
  @MaxLength(64)
  relationship?: string;

  @ApiProperty({ description: 'Contact phone number', example: '+8801711223344' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  phone!: string;

  @ApiPropertyOptional({
    description: 'Contact email address',
    example: 'ayesha.rahman@example.com',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Whether this is the primary contact', default: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

export class CustomerContactResponseDto {
  @ApiProperty({ description: 'Contact UUID' })
  id!: string;

  @ApiProperty({ description: 'Customer UUID' })
  customerId!: string;

  @ApiProperty({ description: 'Contact full name' })
  name!: string;

  @ApiPropertyOptional({ description: 'Relationship to customer' })
  relationship!: string | null;

  @ApiProperty({ description: 'Contact phone number' })
  phone!: string;

  @ApiPropertyOptional({ description: 'Contact email address' })
  email!: string | null;

  @ApiProperty({ description: 'Whether this is the primary contact' })
  isPrimary!: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt!: string;
}
