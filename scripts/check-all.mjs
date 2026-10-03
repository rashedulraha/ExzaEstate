#!/usr/bin/env node

/**
 * Quality Gates Master Runner: pnpm check:all
 *
 * Runs all architecture quality checks:
 * 1. No raw prisma.$transaction on tenant data
 * 2. No raw permission strings
 * 3. No mocks in production code
 * 4. RLS coverage across tenant models
 * 5. Controller permission decorators coverage
 * 6. API client generation check
 * 7. Booking statuses index check
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const checks = [
  { name: 'No Raw Tenant Transactions', script: 'check-no-raw-tenant-transaction.mjs' },
  { name: 'No Raw Permission Strings', script: 'check-no-raw-permissions.mjs' },
  { name: 'No Mocks in Production', script: 'check-no-mocks-in-production.mjs' },
  { name: 'RLS Coverage on Tenant Models', script: 'check-rls-coverage.mjs' },
  { name: 'Controller Permission Decorators', script: 'check-permission-decorators.mjs' },
  { name: 'API Client Generator Check', script: 'check-gen-api.mjs' },
  { name: 'Booking Statuses Index Check', script: 'check-booking-statuses-index.mjs' },
];

console.log('--- Running ExzaEstate Architectural Quality Gates ---');
let failed = 0;

for (const check of checks) {
  const scriptPath = path.join(__dirname, check.script);
  try {
    execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
  } catch {
    console.error(`\x1b[31m✗\x1b[0m ${check.name} failed!`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n\x1b[31m[FAILED]\x1b[0m ${failed} quality gate(s) failed.`);
  process.exit(1);
} else {
  console.log('\n\x1b[32m[PASSED]\x1b[0m All architectural quality gates passed successfully.');
}
