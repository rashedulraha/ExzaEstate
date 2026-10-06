import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LocalProvisioningDto {
  @ApiPropertyOptional({
    description: 'Company name for local standalone',
    example: 'ExzaEstate Local Ltd',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Company code', example: 'LOCAL01' })
  @IsOptional()
  @IsString()
  companyCode?: string;

  @ApiPropertyOptional({
    description: 'Administrator email',
    example: 'admin@local.exzaestate.internal',
  })
  @IsOptional()
  @IsString()
  adminEmail?: string;

  @ApiPropertyOptional({ description: 'Administrator full name', example: 'Local Administrator' })
  @IsOptional()
  @IsString()
  adminName?: string;

  @ApiPropertyOptional({
    description: 'Administrator initial password',
    example: 'AdminLocal1234!',
  })
  @IsOptional()
  @IsString()
  adminPassword?: string;

  @ApiPropertyOptional({ description: 'Company timezone', example: 'Asia/Dhaka' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Company trade license number',
    example: 'TRAD/DNCC/019283/2026',
  })
  @IsOptional()
  @IsString()
  tradeLicense?: string;

  @ApiPropertyOptional({
    description: 'License key issued on purchase',
    example: 'EXZA-ENTERPRISE-2026-ABCD-EF01-9999',
  })
  @IsOptional()
  @IsString()
  licenseKey?: string;

  @ApiPropertyOptional({
    description: 'Machine fingerprint ID',
    example: '8f4c2b9a7d1e3f5a8b0c4e6d2f1a9b7c...',
  })
  @IsOptional()
  @IsString()
  machineId?: string;
}

export class CreateLocalBackupDto {
  @ApiPropertyOptional({ description: 'User-chosen folder destination' })
  @IsOptional()
  @IsString()
  destinationDir?: string;

  @ApiPropertyOptional({
    description: 'Optional label or reason for the backup',
    example: 'Pre-tax audit backup',
  })
  @IsOptional()
  @IsString()
  label?: string;
}

export class RestoreLocalBackupDto {
  @ApiProperty({ description: 'Path or file name of the backup bundle to restore' })
  @IsNotEmpty()
  @IsString()
  backupFilePath!: string;
}

export class LocalBackupStatusResponseDto {
  @ApiProperty({ description: 'Whether the system warns that no backup exists for >= 7 days' })
  hasWarning!: boolean;

  @ApiPropertyOptional({ description: 'Warning banner message if backup is overdue' })
  warningMessage?: string;

  @ApiProperty({ description: 'Days elapsed since the most recent backup' })
  daysSinceLastBackup!: number;

  @ApiProperty({ description: 'Threshold days triggering warning (default: 7)' })
  warnThresholdDays!: number;

  @ApiProperty({ description: 'Total number of backups found in the backup folder' })
  totalBackups!: number;

  @ApiPropertyOptional({ description: 'Timestamp of the latest successful backup' })
  latestBackupAt?: string;

  @ApiProperty({ description: 'Configured backup storage directory' })
  backupDir!: string;
}
