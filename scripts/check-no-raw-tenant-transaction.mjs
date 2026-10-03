#!/usr/bin/env node

/**
 * Architectural Invariant Check: No Raw Prisma $transaction on Tenant Data
 *
 * Rule: AGENTS.md Invariant 3:
 * "Never use raw prisma.$transaction for tenant data, as it bypasses the
 * PostgreSQL RLS session variable. All tenant DB transactions must use
 * tenantDb.transaction(async (tx) => ...) or tenantDb.withCompany(...)."
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SCAN_DIRS = [
  path.join(rootDir, 'apps', 'backend', 'src', 'modules'),
  path.join(rootDir, 'apps', 'backend', 'src', 'platform'),
];

// Allowed exceptions: infrastructure internal files that define or wrap transactions
const ALLOWED_EXCEPTIONS = [path.join(rootDir, 'apps', 'backend', 'src', 'database')];

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.test.ts')) {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

let violations = 0;

for (const dir of SCAN_DIRS) {
  const files = getAllFiles(dir);

  for (const file of files) {
    if (ALLOWED_EXCEPTIONS.some((exc) => file.startsWith(exc))) {
      continue;
    }

    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for raw .$transaction calls
      if (line.includes('.$transaction(')) {
        console.error(
          `\x1b[31m[ERROR]\x1b[0m Raw prisma.$transaction detected at ${path.relative(rootDir, file)}:${index + 1}`,
        );
        console.error(`  Line ${index + 1}: ${line.trim()}`);
        console.error(
          `  \x1b[33mFix:\x1b[0m Use tenantDb.transaction(async (tx) => ...) or tenantDb.withCompany(companyId, async (tx) => ...)\n`,
        );
        violations++;
      }
    });
  }
}

if (violations > 0) {
  console.error(`\x1b[31mFailed:\x1b[0m ${violations} raw transaction violation(s) found.`);
  process.exit(1);
} else {
  console.log(`\x1b[32m✓\x1b[0m No raw prisma.$transaction calls found in tenant modules.`);
}
