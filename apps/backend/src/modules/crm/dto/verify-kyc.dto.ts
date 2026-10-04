import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class VerifyKycDto {
  @ApiPropertyOptional({
    description: 'Verification notes or observation',
    example: 'NID verified against Election Commission database; utility bill address confirmed.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;
}

export class KycStatusResponseDto {
  @ApiPropertyOptional({ description: 'Whether customer meets all KYC completeness rules' })
  isComplete!: boolean;

  @ApiPropertyOptional({ description: 'Whether customer has been verified by an officer' })
  isVerified!: boolean;

  @ApiPropertyOptional({ description: 'Timestamp when KYC was verified' })
  verifiedAt!: string | null;

  @ApiPropertyOptional({ description: 'Officer user UUID who verified KYC' })
  verifiedById!: string | null;

  @ApiPropertyOptional({ description: 'Verification notes' })
  notes!: string | null;

  @ApiPropertyOptional({
    description: 'List of missing requirements if KYC is incomplete',
    type: [String],
  })
  missingRequirements!: string[];
}
