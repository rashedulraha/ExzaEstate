import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBrokerDto {
  @ApiProperty({ description: 'Broker full name', example: 'Hasan Ali' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Phone number', example: '01811223344' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'National ID' })
  @IsString()
  @IsOptional()
  nid?: string;

  @ApiPropertyOptional({ description: 'TIN' })
  @IsString()
  @IsOptional()
  tin?: string;

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

  @ApiPropertyOptional({ description: 'Routing Number' })
  @IsString()
  @IsOptional()
  routingNumber?: string;

  @ApiPropertyOptional({ description: 'Is active', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
