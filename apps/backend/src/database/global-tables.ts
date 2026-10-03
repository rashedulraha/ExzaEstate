/**
 * Global (non-tenant) reference data tables that do not have a company_id column.
 *
 * In accordance with ARCH-GLOBAL-DATA (architecture.md §5.5), these tables:
 * - Are SELECT-only for exza_app runtime role.
 * - Written only by migrations/system seeds under exza_migrator or exza_system.
 * - Any table without company_id that is NOT listed in GLOBAL_TABLES will fail
 *   the RLS coverage test.
 */
export const GLOBAL_TABLES = [
  '_prisma_migrations',
  'global_test_records',
  // Reference tables:
  'geo_divisions',
  'geo_districts',
  'geo_upazilas',
  'banks',
  'bank_branches',
  'system_permissions',
  'notification_event_catalog',
  // System realm tables (ARCH-SYSTEM-SCOPE):
  'system_admins',
  'system_sessions',
] as const;

export type GlobalTableName = (typeof GLOBAL_TABLES)[number];

export function isGlobalTable(tableName: string): boolean {
  return (GLOBAL_TABLES as readonly string[]).includes(tableName);
}
