import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SystemPrisma } from '../../database/system-prisma.service.js';
import type { LocalBackupStatusResponseDto } from './dto/local-data.dto.js';

export interface BackupManifest {
  backupId: string;
  createdAt: string;
  companyId: string;
  companyCode: string;
  schemaVersion: string;
  tableCounts: Record<string, number>;
  checksum: string;
  isPreUpgrade?: boolean;
}

export interface BackupBundle {
  manifest: BackupManifest;
  data: {
    companies?: unknown[];
    branches?: unknown[];
    departments?: unknown[];
    users?: unknown[];
    settings?: unknown[];
    accounts?: unknown[];
    journals?: unknown[];
    journalLines?: unknown[];
    properties?: unknown[];
    customers?: unknown[];
    bookings?: unknown[];
    documents?: unknown[];
  };
}

function safeStringify(data: unknown, space?: number): string {
  return JSON.stringify(data, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), space);
}

@Injectable()
export class LocalBackupService {
  private readonly logger = new Logger(LocalBackupService.name);
  private readonly defaultBackupDir: string;
  private readonly maxRetainedBackups = 14;
  private readonly warnThresholdDays = 7;

  constructor(private readonly systemPrisma: SystemPrisma) {
    this.defaultBackupDir =
      process.env.LOCAL_BACKUP_DIR || path.resolve(process.cwd(), '.local-backups');
  }

  getBackupDir(customDir?: string): string {
    return customDir ? path.resolve(customDir) : this.defaultBackupDir;
  }

  private async ensureDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
  }

  async createBackup(options?: {
    destinationDir?: string;
    label?: string;
    isPreUpgrade?: boolean;
  }): Promise<{ backupId: string; filePath: string; manifest: BackupManifest }> {
    const backupDir = this.getBackupDir(options?.destinationDir);
    await this.ensureDir(backupDir);

    const backupId = crypto.randomUUID();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const prefix = options?.isPreUpgrade ? 'pre-upgrade' : 'manual';
    const filePath = path.join(backupDir, `${prefix}-backup-${timestamp}.exzabackup`);

    const snapshot = await this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Export all tenant data for standalone local backup',
      async (client) => ({
        companies: await client.company.findMany(),
        branches: await client.branch.findMany(),
        departments: await client.department.findMany(),
        users: await client.user.findMany(),
        settings: await client.companySetting.findMany(),
        accounts: await client.account.findMany(),
        journals: await client.journal.findMany(),
        journalLines: await client.journalLine.findMany(),
        properties: await client.property.findMany(),
        customers: await client.customer.findMany(),
        bookings: await client.booking.findMany(),
        documents: await client.document.findMany(),
      }),
    );

    const tableCounts: Record<string, number> = {};
    for (const [table, rows] of Object.entries(snapshot)) {
      tableCounts[table] = rows.length;
    }

    const firstCompany = snapshot.companies[0];
    const dataString = safeStringify(snapshot);
    const checksum = crypto.createHash('sha256').update(dataString).digest('hex');

    const manifest: BackupManifest = {
      backupId,
      createdAt: new Date().toISOString(),
      companyId: firstCompany?.id ?? 'none',
      companyCode: firstCompany?.code ?? 'NONE',
      schemaVersion: '1.0.0',
      tableCounts,
      checksum,
      isPreUpgrade: options?.isPreUpgrade,
    };

    const bundle: BackupBundle = { manifest, data: snapshot };
    await fs.writeFile(filePath, safeStringify(bundle, 2), 'utf-8');
    this.logger.log(`Created backup [${backupId}] at ${filePath}`);

    await this.pruneOldBackups(backupDir);
    return { backupId, filePath, manifest };
  }

  async preUpgradeBackup(): Promise<{ backupId: string; filePath: string }> {
    this.logger.log('Triggering automatic pre-upgrade backup...');
    const result = await this.createBackup({
      isPreUpgrade: true,
      label: 'Pre-upgrade automatic backup',
    });
    return { backupId: result.backupId, filePath: result.filePath };
  }

  async runSafeMigration(migrationRunner: () => Promise<void>): Promise<void> {
    const { filePath } = await this.preUpgradeBackup();
    try {
      this.logger.log('Running schema migration...');
      await migrationRunner();
      this.logger.log('Schema migration succeeded');
    } catch (migrationErr) {
      this.logger.error(
        'Migration failed! Initiating automatic pre-upgrade rollback...',
        migrationErr,
      );
      try {
        await this.restoreBackup(filePath);
        this.logger.log('Automatic rollback completed successfully');
      } catch (rollbackErr) {
        this.logger.fatal('Rollback of failed migration failed!', rollbackErr);
      }
      throw new BadRequestException(
        `Migration failed and was rolled back to pre-upgrade backup: ${migrationErr instanceof Error ? migrationErr.message : String(migrationErr)}`,
      );
    }
  }

  async restoreBackup(backupFilePath: string): Promise<BackupManifest> {
    const rawContent = await fs.readFile(backupFilePath, 'utf-8');
    const bundle = JSON.parse(rawContent) as BackupBundle;

    const dataString = safeStringify(bundle.data);
    const computedChecksum = crypto.createHash('sha256').update(dataString).digest('hex');

    if (computedChecksum !== bundle.manifest.checksum) {
      throw new BadRequestException('Corrupted backup file: checksum mismatch');
    }

    this.logger.log(`Restoring backup ${bundle.manifest.backupId}`);

    await this.systemPrisma.executeWithReason(
      '// SYSTEM-SCOPE: Restore tenant database from standalone backup bundle',
      async (client) => {
        // Safe clear in reverse dependency order
        await client.document.deleteMany();
        await client.journalLine.deleteMany();
        await client.journal.deleteMany();
        await client.booking.deleteMany();
        await client.customer.deleteMany();
        await client.property.deleteMany();
        await client.account.deleteMany();
        await client.companySetting.deleteMany();
        await client.user.deleteMany();
        await client.department.deleteMany();
        await client.branch.deleteMany();
        await client.company.deleteMany();

        // Restore in dependency order using typed create inputs
        for (const c of bundle.data.companies || []) {
          await client.company.create({ data: c as unknown as Prisma.CompanyCreateInput });
        }
        for (const b of bundle.data.branches || []) {
          await client.branch.create({ data: b as unknown as Prisma.BranchCreateInput });
        }
        for (const d of bundle.data.departments || []) {
          await client.department.create({ data: d as unknown as Prisma.DepartmentCreateInput });
        }
        for (const u of bundle.data.users || []) {
          await client.user.create({ data: u as unknown as Prisma.UserCreateInput });
        }
        for (const s of bundle.data.settings || []) {
          await client.companySetting.create({
            data: s as unknown as Prisma.CompanySettingCreateInput,
          });
        }
        for (const a of bundle.data.accounts || []) {
          await client.account.create({ data: a as unknown as Prisma.AccountCreateInput });
        }
        for (const p of bundle.data.properties || []) {
          await client.property.create({ data: p as unknown as Prisma.PropertyCreateInput });
        }
        for (const cust of bundle.data.customers || []) {
          await client.customer.create({ data: cust as unknown as Prisma.CustomerCreateInput });
        }
        for (const bk of bundle.data.bookings || []) {
          await client.booking.create({ data: bk as unknown as Prisma.BookingCreateInput });
        }
        for (const j of bundle.data.journals || []) {
          await client.journal.create({ data: j as unknown as Prisma.JournalCreateInput });
        }
        for (const jl of bundle.data.journalLines || []) {
          await client.journalLine.create({ data: jl as unknown as Prisma.JournalLineCreateInput });
        }
        for (const doc of bundle.data.documents || []) {
          await client.document.create({ data: doc as unknown as Prisma.DocumentCreateInput });
        }
      },
    );

    this.logger.log(`Backup restoration complete for company ${bundle.manifest.companyCode}`);
    return bundle.manifest;
  }

  async getBackupStatus(customDir?: string): Promise<LocalBackupStatusResponseDto> {
    const backupDir = this.getBackupDir(customDir);
    await this.ensureDir(backupDir);

    const files = await fs.readdir(backupDir);
    const backupFiles = files.filter((f) => f.endsWith('.exzabackup'));

    if (backupFiles.length === 0) {
      return {
        hasWarning: true,
        warningMessage:
          'Warning: No backup has ever been taken. Your local database is unprotected.',
        daysSinceLastBackup: 999,
        warnThresholdDays: this.warnThresholdDays,
        totalBackups: 0,
        backupDir,
      };
    }

    let latestMtime = 0;
    for (const f of backupFiles) {
      const stats = await fs.stat(path.join(backupDir, f));
      if (stats.mtimeMs > latestMtime) latestMtime = stats.mtimeMs;
    }

    const elapsedDays = Math.max(0, Math.floor((Date.now() - latestMtime) / (1000 * 60 * 60 * 24)));
    const hasWarning = elapsedDays >= this.warnThresholdDays;

    return {
      hasWarning,
      warningMessage: hasWarning
        ? `Warning: No backup taken in the last ${elapsedDays} days (threshold is ${this.warnThresholdDays} days).`
        : undefined,
      daysSinceLastBackup: elapsedDays,
      warnThresholdDays: this.warnThresholdDays,
      totalBackups: backupFiles.length,
      latestBackupAt: new Date(latestMtime).toISOString(),
      backupDir,
    };
  }

  private async pruneOldBackups(backupDir: string): Promise<void> {
    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = files
        .filter((f) => f.endsWith('.exzabackup'))
        .map((f) => path.join(backupDir, f));

      if (backupFiles.length <= this.maxRetainedBackups) return;

      const fileStats = await Promise.all(
        backupFiles.map(async (file) => ({
          file,
          mtime: (await fs.stat(file)).mtimeMs,
        })),
      );

      fileStats.sort((a, b) => b.mtime - a.mtime);
      const toDelete = fileStats.slice(this.maxRetainedBackups);

      for (const item of toDelete) {
        await fs.unlink(item.file);
        this.logger.debug(`Pruned expired backup file: ${item.file}`);
      }
    } catch (err) {
      this.logger.warn('Failed to prune old backups', err);
    }
  }
}
