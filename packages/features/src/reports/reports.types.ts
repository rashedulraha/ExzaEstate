export type ReportCategory =
  | 'ALL'
  | 'FINANCIAL'
  | 'SALES'
  | 'COLLECTION'
  | 'INVENTORY'
  | 'PROCUREMENT'
  | 'AUDIT';

export type ReportFrequency =
  | 'REAL_TIME'
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY_CLOSE'
  | 'QUARTERLY'
  | 'ANNUAL'
  | 'ON_DEMAND';

export type ExportFormat = 'PDF' | 'EXCEL' | 'CSV';

export interface ReportItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: ReportCategory;
  frequency: ReportFrequency;
  tag: string;
  path: string;
  hasInteractiveView: boolean;
  formats: ExportFormat[];
  statutoryLevel?: 'P0' | 'P1' | 'STANDARD';
  targetAudience?: string;
}

export interface RecentExportItem {
  id: string;
  reportCode: string;
  reportTitle: string;
  format: ExportFormat;
  createdAt: string;
  fileSize: string;
  status: 'READY' | 'QUEUED' | 'FAILED';
}

export interface ReportGenerationParams {
  reportId: string;
  format: ExportFormat;
  asOfDate?: string;
  startDate?: string;
  endDate?: string;
  projectId?: string;
}
