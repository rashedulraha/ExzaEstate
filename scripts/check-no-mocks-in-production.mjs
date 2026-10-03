#!/usr/bin/env node

/**
 * Architectural Invariant Check: No Mocks in Production Code
 *
 * Rule: ARCH-SEED & architecture.md §17 / §23:
 * "Frontend components, hooks, and feature pages must never contain
 * hardcoded mock data arrays (const mockData = [...]). The UI strictly
 * consumes generated TanStack Query hooks and real seed data.
 * No imports from mocks/ or mock packages in production code."
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SCAN_DIRS = [
  path.join(rootDir, 'apps', 'backend', 'src'),
  path.join(rootDir, 'apps', 'desktop', 'src'),
  path.join(rootDir, 'apps', 'web', 'src'),
  path.join(rootDir, 'packages', 'app-core', 'src'),
  path.join(rootDir, 'packages', 'features', 'src'),
  path.join(rootDir, 'packages', 'ui', 'src'),
];

// Patterns representing mock imports in production files
const MOCK_IMPORT_REGEX =
  /from\s+['"][^'"]*\/mocks(\/.*)?['"]|from\s+['"](@faker-js\/faker|faker)['"]/;

// Patterns representing hardcoded mock arrays: const mock... = [ or const MOCK_... = [
const MOCK_ARRAY_REGEX =
  /(?:const|let|var)\s+(?:mock[A-Za-z0-9_]*|MOCK_[A-Za-z0-9_]*)\s*(?::\s*[^=]+)?\s*=\s*\[/;

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else if (
      file.endsWith('.ts') ||
      file.endsWith('.tsx') ||
      file.endsWith('.js') ||
      file.endsWith('.jsx')
    ) {
      if (!file.endsWith('.spec.ts') && !file.endsWith('.test.ts') && !file.endsWith('.test.tsx')) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

let violations = 0;

for (const dir of SCAN_DIRS) {
  const files = getAllFiles(dir);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // 1. Check for mock imports
      if (MOCK_IMPORT_REGEX.test(line)) {
        console.error(
          `\x1b[31m[ERROR]\x1b[0m Forbidden mock import in production code at ${path.relative(rootDir, file)}:${index + 1}`,
        );
        console.error(`  Line ${index + 1}: ${line.trim()}`);
        console.error(
          `  \x1b[33mFix:\x1b[0m Remove mock import. Production code must consume real API / services.\n`,
        );
        violations++;
      }

      // 2. Check for mock arrays
      if (MOCK_ARRAY_REGEX.test(line)) {
        console.error(
          `\x1b[31m[ERROR]\x1b[0m Forbidden mock array in production code at ${path.relative(rootDir, file)}:${index + 1}`,
        );
        console.error(`  Line ${index + 1}: ${line.trim()}`);
        console.error(
          `  \x1b[33mFix:\x1b[0m Do not hardcode mock arrays in UI or service code. Use real database seed data via 'pnpm db:seed:demo' (ARCH-SEED).\n`,
        );
        violations++;
      }
    });
  }
}

if (violations > 0) {
  console.error(`\x1b[31mFailed:\x1b[0m ${violations} mock violation(s) found in production code.`);
  process.exit(1);
} else {
  console.log(`\x1b[32m✓\x1b[0m No mock imports or hardcoded mock arrays in production code.`);
}
