import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectCostBreakdownDto {
  @ApiProperty({ description: 'Land cost in paisa' })
  landCostPaisa!: string;

  @ApiProperty({ description: 'Development cost in paisa' })
  developmentCostPaisa!: string;

  @ApiProperty({ description: 'Marketing cost in paisa' })
  marketingCostPaisa!: string;

  @ApiProperty({ description: 'Administrative cost in paisa' })
  adminCostPaisa!: string;

  @ApiProperty({ description: 'Other cost in paisa' })
  otherCostPaisa!: string;

  @ApiProperty({ description: 'Total cost in paisa' })
  totalCostPaisa!: string;
}

export class ProjectProfitabilityItemDto {
  @ApiProperty({ description: 'Project UUID' })
  projectId!: string;

  @ApiProperty({ description: 'Project code' })
  projectCode!: string;

  @ApiProperty({ description: 'Project name' })
  projectName!: string;

  @ApiProperty({ description: 'Total recognized revenue in paisa' })
  totalRevenuePaisa!: string;

  @ApiProperty({ type: ProjectCostBreakdownDto })
  costBreakdown!: ProjectCostBreakdownDto;

  @ApiProperty({ description: 'Total cost in paisa' })
  totalCostPaisa!: string;

  @ApiProperty({ description: 'Net profit in paisa' })
  netProfitPaisa!: string;

  @ApiProperty({ description: 'Profit margin percentage' })
  profitMarginPercent!: number;

  @ApiProperty({ description: 'Whether project is profitable' })
  isProfitable!: boolean;

  @ApiPropertyOptional({ description: 'Estimated budget in paisa', nullable: true })
  estimatedBudgetPaisa?: string | null;

  @ApiPropertyOptional({ description: 'Budget variance in paisa', nullable: true })
  budgetVariancePaisa?: string | null;
}

export class ProjectProfitabilitySummaryDto {
  @ApiProperty({ description: 'Total portfolio revenue in paisa' })
  totalRevenuePaisa!: string;

  @ApiProperty({ description: 'Total portfolio cost in paisa' })
  totalCostPaisa!: string;

  @ApiProperty({ description: 'Total portfolio profit in paisa' })
  totalProfitPaisa!: string;

  @ApiProperty({ description: 'Overall margin percentage' })
  overallMarginPercent!: number;

  @ApiProperty({ description: 'Number of profitable projects' })
  profitableProjectsCount!: number;

  @ApiProperty({ description: 'Number of loss-making projects' })
  lossMakingProjectsCount!: number;
}

export class ProjectProfitabilityReportDto {
  @ApiProperty({ description: 'Report as-of date (ISO format)' })
  asOfDate!: string;

  @ApiPropertyOptional({ description: 'Reporting start date' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'Reporting end date' })
  endDate?: string;

  @ApiProperty({ type: ProjectProfitabilitySummaryDto })
  summary!: ProjectProfitabilitySummaryDto;

  @ApiProperty({ type: [ProjectProfitabilityItemDto] })
  projects!: ProjectProfitabilityItemDto[];
}
