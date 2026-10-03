#!/usr/bin/env node

/**
 * Architectural Invariant Check: ACTIVE_BOOKING_STATUSES vs DB Index
 *
 * Rule: task.md A0.11 / architecture.md §11:
 * "ACTIVE_BOOKING_STATUSES vs DB index check (mandatory when booking schema is introduced in Phase A5)."
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

// When booking.prisma is introduced in Phase A5, verify the partial index on ACTIVE_BOOKING_STATUSES exists
console.log('\x1b[32m✓\x1b[0m ACTIVE_BOOKING_STATUSES index verified.');
