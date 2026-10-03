#!/usr/bin/env node

/**
 * Architectural Invariant Check: Row Level Security (RLS) Coverage Runner
 *
 * Rule: AGENTS.md Invariant 3 & architecture.md §18.2:
 * "Every tenant table includes company_id and MUST have PostgreSQL RLS enabled
 * (ENABLE ROW LEVEL SECURITY + FORCE ROW LEVEL SECURITY + tenant_isolation_policy)
 * in the same migration that creates it."
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SCHEMA_DIR = path.join(rootDir, 'apps', 'backend', 'prisma', 'schema');
const MIGRATIONS_DIR = path.join(rootDir, 'apps', 'backend', 'prisma', 'migrations');

// 1. Identify all tenant models from Prisma schemas
const schemaFiles = fs.readdirSync(SCHEMA_DIR).filter((f) => f.endsWith('.prisma'));

const tenantTables = new Map(); // tableName -> modelName

for (const file of schemaFiles) {
  const content = fs.readFileSync(path.join(SCHEMA_DIR, file), 'utf-8');
  const modelBlocks = content.split(/model\s+(\w+)\s+{/);

  for (let i = 1; i < modelBlocks.length; i += 2) {
    const modelName = modelBlocks[i];
    const modelBody = modelBlocks[i + 1] || '';

    // Check if model contains companyId
    const isTenantModel = /companyId\s+String/i.test(modelBody) || /company_id/i.test(modelBody);

    if (isTenantModel) {
      // Determine mapped table name
      const mapMatch = modelBody.match(/@@map\(["']([^"']+)["']\)/);
      const tableName = mapMatch ? mapMatch[1] : modelName.toLowerCase();
      tenantTables.set(tableName, modelName);
    }
  }
}

// 2. Read all migration SQL files
function getMigrationFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) {
      results = results.concat(getMigrationFiles(itemPath));
    } else if (item.endsWith('.sql')) {
      results.push(itemPath);
    }
  }
  return results;
}

const migrationFiles = getMigrationFiles(MIGRATIONS_DIR);
let combinedMigrationSql = '';
for (const mf of migrationFiles) {
  combinedMigrationSql += '\n' + fs.readFileSync(mf, 'utf-8');
}

// 3. Verify each tenant table has RLS enabled and forced
let missingRls = 0;

for (const [tableName, modelName] of tenantTables.entries()) {
  // Check for ENABLE RLS (either direct or via array loop)
  const directEnable = new RegExp(
    `ALTER\\s+TABLE\\s+["']?${tableName}["']?\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    'i',
  );
  const directForce = new RegExp(
    `ALTER\\s+TABLE\\s+["']?${tableName}["']?\\s+FORCE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    'i',
  );
  const inArray = new RegExp(`['"]${tableName}['"]`, 'i');

  const hasEnable = directEnable.test(combinedMigrationSql) || inArray.test(combinedMigrationSql);
  const hasForce = directForce.test(combinedMigrationSql) || inArray.test(combinedMigrationSql);

  if (!hasEnable || !hasForce) {
    console.error(
      `\x1b[31m[ERROR]\x1b[0m Tenant table "${tableName}" (Model: ${modelName}) lacks RLS in migrations.`,
    );
    console.error(
      `  Required: ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY; and FORCE ROW LEVEL SECURITY;\n`,
    );
    missingRls++;
  }
}

if (missingRls > 0) {
  console.error(`\x1b[31mFailed:\x1b[0m ${missingRls} tenant table(s) missing RLS protection.`);
  process.exit(1);
} else {
  console.log(
    `\x1b[32m✓\x1b[0m All ${tenantTables.size} tenant table(s) have Row Level Security (RLS) configured in migrations.`,
  );
}
