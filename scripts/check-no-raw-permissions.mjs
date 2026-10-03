#!/usr/bin/env node

/**
 * Architectural Invariant Check: No Raw Permission String Literals
 *
 * Rule: architecture.md §13 & §23:
 * "No magic strings for permissions (import constants from @exzaestate/shared).
 * Don't type 'journal:post' as a string literal; use PERMISSIONS.JOURNAL_POST."
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SCAN_DIRS = [
  path.join(rootDir, 'apps', 'backend', 'src'),
  path.join(rootDir, 'packages', 'app-core', 'src'),
  path.join(rootDir, 'packages', 'features', 'src'),
  path.join(rootDir, 'apps', 'desktop', 'src'),
  path.join(rootDir, 'apps', 'web', 'src'),
];

// Regex matching raw permission literals e.g. 'company:read', "property:update", `user:delete`
const RAW_PERMISSION_REGEX = /['"`]([a-z0-9_]+:[a-z0-9_]+)['"`]/g;

function isExcludedFile(filePath) {
  if (filePath.endsWith('packages/shared/src/permissions.ts')) return true;
  return (
    filePath.endsWith('.spec.ts') || filePath.endsWith('.test.ts') || filePath.endsWith('.test.tsx')
  );
}

function isCommentLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
}

function isUrlOrUrn(str) {
  return str.startsWith('http:') || str.startsWith('https:') || str.includes('//');
}

function isPermissionContext(line) {
  return (
    line.includes('@RequirePermission') ||
    line.includes('hasPermission') ||
    line.includes('checkPermission') ||
    line.includes('permissions') ||
    line.includes('Permission')
  );
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (!isExcludedFile(fullPath)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

let violations = 0;

function checkLine(line, index, file) {
  if (isCommentLine(line)) return;

  let match;
  RAW_PERMISSION_REGEX.lastIndex = 0;
  while ((match = RAW_PERMISSION_REGEX.exec(line)) !== null) {
    const matchedStr = match[1];
    if (isUrlOrUrn(matchedStr)) continue;

    if (isPermissionContext(line)) {
      console.error(
        `\x1b[31m[ERROR]\x1b[0m Raw permission string "${matchedStr}" detected at ${path.relative(rootDir, file)}:${index + 1}`,
      );
      console.error(`  Line ${index + 1}: ${line.trim()}`);
      console.error(`  \x1b[33mFix:\x1b[0m Use PERMISSIONS.<NAME> from '@exzaestate/shared'.\n`);
      violations++;
    }
  }
}

for (const dir of SCAN_DIRS) {
  const files = getAllFiles(dir);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, index) => checkLine(line, index, file));
  }
}

if (violations > 0) {
  console.error(`\x1b[31mFailed:\x1b[0m ${violations} raw permission string violation(s) found.`);
  process.exit(1);
} else {
  console.log(`\x1b[32m✓\x1b[0m No raw permission strings found in application code.`);
}
