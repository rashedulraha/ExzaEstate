import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApprovalStepResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  approvalId!: string;

  @ApiProperty()
  stepOrder!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  requiredPermission!: string;

  @ApiPropertyOptional()
  approverId?: string | null;

  @ApiPropertyOptional()
  decidedAt?: string | null;

  @ApiPropertyOptional()
  decision?: string | null;

  @ApiPropertyOptional()
  comments?: string | null;

  @ApiPropertyOptional()
  dueAt?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class ApprovalResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  approvalNumber!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  requesterId!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiPropertyOptional()
  entityType?: string | null;

  @ApiPropertyOptional()
  entityId?: string | null;

  @ApiPropertyOptional()
  projectId?: string | null;

  @ApiPropertyOptional()
  branchId?: string | null;

  @ApiPropertyOptional()
  amountPaisa?: string | null;

  @ApiPropertyOptional()
  percentage?: number | null;

  @ApiProperty()
  payload!: Record<string, unknown>;

  @ApiProperty()
  currentStepOrder!: number;

  @ApiProperty()
  totalSteps!: number;

  @ApiProperty()
  isAutoApproved!: boolean;

  @ApiProperty()
  expiresAt!: string;

  @ApiPropertyOptional()
  completedAt?: string | null;

  @ApiPropertyOptional()
  finalDecision?: string | null;

  @ApiPropertyOptional()
  rejectionReason?: string | null;

  @ApiPropertyOptional()
  overrideFirstUserId?: string | null;

  @ApiPropertyOptional()
  overrideFirstAt?: string | null;

  @ApiPropertyOptional()
  overrideFirstReason?: string | null;

  @ApiPropertyOptional()
  overrideSecondUserId?: string | null;

  @ApiPropertyOptional()
  overrideSecondAt?: string | null;

  @ApiPropertyOptional()
  overrideSecondReason?: string | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;

  @ApiProperty({ type: [ApprovalStepResponseDto] })
  steps!: ApprovalStepResponseDto[];
}

export class ApprovalListResponseDto {
  @ApiProperty({ type: [ApprovalResponseDto] })
  items!: ApprovalResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class ApprovalRuleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  minAmountPaisa!: string;

  @ApiPropertyOptional()
  maxAmountPaisa?: string | null;

  @ApiPropertyOptional()
  minPercentage?: number | null;

  @ApiPropertyOptional()
  maxPercentage?: number | null;

  @ApiPropertyOptional()
  projectId?: string | null;

  @ApiPropertyOptional()
  branchId?: string | null;

  @ApiProperty()
  requiredPermission!: string;

  @ApiProperty()
  stepOrder!: number;

  @ApiProperty()
  slaHours!: number;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export class RequestApprovalResultDto {
  @ApiProperty({
    description: 'Whether approval is required for the requested action',
    example: true,
  })
  required!: boolean;

  @ApiPropertyOptional({
    description: 'Generated approval UUID if approval was created',
    example: '01919920-d3cf-7e3f-8c3e-f14d8ea0283c',
  })
  approvalId?: string;

  @ApiPropertyOptional({
    description: 'Approval sequence number',
    example: 'APP-2026-00001',
  })
  approvalNumber?: string;

  @ApiPropertyOptional({
    description: 'Initial approval status (PENDING or AUTO_APPROVED)',
    example: 'PENDING',
  })
  status?: string;

  @ApiPropertyOptional({
    description: 'Whether auto-approved under single-user mode',
    example: false,
  })
  autoApproved?: boolean;
}
