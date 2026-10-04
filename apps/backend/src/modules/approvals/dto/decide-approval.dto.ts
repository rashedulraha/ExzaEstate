import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApproveApprovalDto {
  @ApiPropertyOptional({
    description: 'Optional comments or notes regarding the approval decision',
    example: 'Approved based on executive committee board clearance.',
  })
  @IsString()
  @IsOptional()
  comments?: string;

  @ApiPropertyOptional({
    description: 'Alias for comments',
    example: 'Approved based on executive committee board clearance.',
  })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class RejectApprovalDto {
  @ApiPropertyOptional({
    description: 'Mandatory reason for rejecting the approval request',
    example: 'Discount exceeds allowed corporate policy ceiling.',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
