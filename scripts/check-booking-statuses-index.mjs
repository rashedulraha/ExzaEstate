#!/usr/bin/env node

/**
 * Architectural Invariant Check: ACTIVE_BOOKING_STATUSES vs DB Index
 *
 * Rule: task.md A0.11 / A5.3 / architecture.md §10:
 * "CI check that the index's status list equals ACTIVE_BOOKING_STATUSES in packages/shared."
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const bookingSchemaPath = path.join(
  rootDir,
  'apps',
  'backend',
  'prisma',
  'schema',
  'booking.prisma',
);

if (!fs.existsSync(bookingSchemaPath)) {
  console.log(
    '\x1b[33m[NOTICE]\x1b[0m scripts/check-booking-statuses-index: booking schema not yet present. Active from Phase A5.',
  );
  process.exit(0);
}

// 1. Read ACTIVE_BOOKING_STATUSES from packages/shared/src/statuses.ts
const statusesPath = path.join(rootDir, 'packages', 'shared', 'src', 'statuses.ts');
const statusesContent = fs.readFileSync(statusesPath, 'utf-8');

const matchActive = statusesContent.match(
  /export const ACTIVE_BOOKING_STATUSES = \[([\s\S]*?)\] as const;/,
);
if (!matchActive) {
  console.error('\x1b[31m[ERROR]\x1b[0m ACTIVE_BOOKING_STATUSES array not found in statuses.ts');
  process.exit(1);
}

// Extract booking status keys: e.g. BOOKING_STATUSES.REQUESTED -> REQUESTED
const expectedStatuses = [...matchActive[1].matchAll(/BOOKING_STATUSES\.([A-Z_]+)/g)].map(
  (m) => m[1],
);

if (expectedStatuses.length !== 6) {
  console.error(
    `\x1b[31m[ERROR]\x1b[0m Expected exactly 6 active booking statuses, found ${expectedStatuses.length}`,
  );
  process.exit(1);
}

// 2. Read migrations to find the partial unique index
const migrationsDir = path.join(rootDir, 'apps', 'backend', 'prisma', 'migrations');
function getMigrationSqlFiles(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const p = path.join(dir, item);
    if (fs.statSync(p).isDirectory()) {
      files = files.concat(getMigrationSqlFiles(p));
    } else if (item.endsWith('.sql')) {
      files.push(p);
    }
  }
  return files;
}

const allSql = getMigrationSqlFiles(migrationsDir)
  .map((f) => fs.readFileSync(f, 'utf-8'))
  .join('\n');

const indexRegex =
  /CREATE\s+UNIQUE\s+INDEX\s+["']?bookings_active_property_idx["']?\s+ON\s+["']?bookings["']?\s*\([^)]+\)\s+WHERE\s+status\s+IN\s*\(([^)]+)\)/i;
const indexMatch = allSql.match(indexRegex);

if (!indexMatch) {
  console.error(
    '\x1b[31m[ERROR]\x1b[0m Partial unique index "bookings_active_property_idx" not found in migrations!',
  );
  process.exit(1);
}

const indexedStatuses = [...indexMatch[1].matchAll(/['"]([A-Z_]+)['"]/g)].map((m) => m[1]);

// Compare sorted lists
const sortedExpected = [...expectedStatuses].sort();
const sortedIndexed = [...indexedStatuses].sort();

const isMatch =
  sortedExpected.length === sortedIndexed.length &&
  sortedExpected.every((val, idx) => val === sortedIndexed[idx]);

if (!isMatch) {
  console.error(
    `\x1b[31m[ERROR]\x1b[0m DB partial index status list does not match ACTIVE_BOOKING_STATUSES!\n  Expected: ${sortedExpected.join(', ')}\n  Found in Index: ${sortedIndexed.join(', ')}`,
  );
  process.exit(1);
}

console.log(
  `\x1b[32m✓\x1b[0m ACTIVE_BOOKING_STATUSES index verified (${indexedStatuses.join(', ')}).`,
);
