export type CsvMigrationEntity =
  | 'CUSTOMERS'
  | 'PROPERTIES'
  | 'LEADS'
  | 'OPENING_BALANCES'
  | 'LEGACY_BOOKINGS';

export interface CsvRowError {
  rowNumber: number;
  field?: string;
  code: string;
  message: string;
  rawRow?: Record<string, string>;
}

export interface CsvValidationReport {
  entity: CsvMigrationEntity;
  isValid: boolean;
  totalRows: number;
  validRowsCount: number;
  errorRowsCount: number;
  errors: CsvRowError[];
}

export interface CsvImportResult {
  entity: CsvMigrationEntity;
  importedCount: number;
  status: 'SUCCESS' | 'FAILED';
  validationReport?: CsvValidationReport;
}

export interface CsvTemplateDefinition {
  entity: CsvMigrationEntity;
  headers: string[];
  sampleRow: string[];
  csvContent: string;
}
