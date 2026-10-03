import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ERROR_CODES, PERMISSIONS } from '@exzaestate/shared';
import { AppException, ValidationException } from '../../common/exceptions/app.exception.js';
import { TenantDb } from '../../database/tenant-db.service.js';
import { AuditService } from '../../platform/audit/audit.service.js';
import { PermissionService } from '../auth/permission.service.js';
import { SETTINGS_CATALOGUE, SENSITIVE_SETTINGS_KEYS } from './settings.catalogue.js';
import { SettingEntryDto } from './dto/settings.dto.js';

@Injectable()
export class SettingsService {
  constructor(
    private readonly tenantDb: TenantDb,
    private readonly auditService: AuditService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Retrieves all company settings merged with default catalogue fallback values.
   */
  async getAllSettings(): Promise<Record<string, unknown>> {
    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;
      const records = await tx.companySetting.findMany({
        where: { companyId },
      });

      const dbMap = new Map<string, unknown>();
      for (const r of records) {
        dbMap.set(r.key, r.value);
      }

      const merged: Record<string, unknown> = {};
      for (const [key, def] of Object.entries(SETTINGS_CATALOGUE)) {
        merged[key] = dbMap.has(key) ? dbMap.get(key) : def.defaultValue;
      }

      return merged;
    });
  }

  /**
   * Retrieves a single setting by key, falling back to the catalogue default if unconfigured.
   */
  async getSetting<T = unknown>(key: string): Promise<T> {
    const def = SETTINGS_CATALOGUE[key];
    if (!def) {
      throw new AppException(ERROR_CODES.NOT_FOUND, `Unknown configuration key: "${key}"`);
    }

    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;
      const record = await tx.companySetting.findUnique({
        where: {
          companyId_key: { companyId, key },
        },
      });

      return (record ? record.value : def.defaultValue) as T;
    });
  }

  /**
   * Updates a single setting with Zod validation, sensitive key enforcement, and audit logging.
   */
  async updateSetting(
    key: string,
    value: unknown,
    userId: string,
    sessionId: string,
  ): Promise<{ key: string; value: unknown }> {
    const def = SETTINGS_CATALOGUE[key];
    if (!def) {
      throw new AppException(ERROR_CODES.NOT_FOUND, `Unknown configuration key: "${key}"`);
    }

    // 1. Zod schema validation
    const parsed = def.schema.safeParse(value);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid setting value';
      throw new ValidationException(`Validation failed for setting "${key}": ${errorMsg}`);
    }

    return this.tenantDb.transaction(async (tx) => {
      const companyId = tx.currentCompanyId;

      // 2. Sensitive keys check: requires settings:manage + active step-up
      if (def.isSensitive || SENSITIVE_SETTINGS_KEYS.has(key)) {
        const { permissions } = await this.permissionService.resolvePermissions(companyId, userId);
        if (!permissions.includes(PERMISSIONS.SETTINGS_MANAGE)) {
          throw new AppException(
            ERROR_CODES.FORBIDDEN,
            `Modifying sensitive setting "${key}" requires settings:manage permission`,
          );
        }

        const session = await tx.session.findUnique({
          where: { id: sessionId, companyId },
          select: { stepUpUntil: true },
        });

        if (!session?.stepUpUntil || new Date(session.stepUpUntil) <= new Date()) {
          throw new AppException(
            ERROR_CODES.STEP_UP_REQUIRED,
            `Step-up authentication is required to modify sensitive setting "${key}"`,
          );
        }
      }

      // 3. Read old value for audit logging
      const existing = await tx.companySetting.findUnique({
        where: { companyId_key: { companyId, key } },
      });
      const oldValue = existing ? existing.value : def.defaultValue;

      // 4. Upsert setting
      const updated = await tx.companySetting.upsert({
        where: { companyId_key: { companyId, key } },
        update: { value: parsed.data as Prisma.InputJsonValue },
        create: {
          companyId,
          key,
          value: parsed.data as Prisma.InputJsonValue,
        },
      });

      // 5. Append-only audit log (ARCH-AUDIT)
      await this.auditService.record(tx, {
        action: 'SETTING_UPDATED',
        module: 'settings',
        entity: 'company_setting',
        entityId: updated.id,
        before: { key, value: oldValue },
        after: { key, value: parsed.data },
      });

      return { key, value: parsed.data };
    });
  }

  /**
   * Updates a batch of settings atomically in a single transaction.
   */
  async updateBatch(
    entries: SettingEntryDto[],
    userId: string,
    sessionId: string,
  ): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {};

    for (const entry of entries) {
      const res = await this.updateSetting(entry.key, entry.value, userId, sessionId);
      results[res.key] = res.value;
    }

    return results;
  }
}
