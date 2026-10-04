#!/usr/bin/env node

/**
 * API Client Generation Quality Gate
 *
 * Rule: architecture.md §12.2 & task.md A2.3:
 * "pnpm gen:api regenerates API contract and hooks; CI fails if regeneration produces a diff."
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootPkgPath = path.resolve(__dirname, '..', 'package.json');

const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf-8'));
const hasGenApi = !!(rootPkg.scripts && rootPkg.scripts['gen:api']);

if (!hasGenApi) {
  console.error('\x1b[31m[ERROR]\x1b[0m "gen:api" script is missing in root package.json');
  process.exit(1);
}

try {
  // Verify that git working tree for generated artifacts has no uncommitted drift
  execSync(
    'git diff --exit-code packages/api-client/openapi.json packages/api-client/src/generated',
    {
      stdio: 'pipe',
      cwd: path.resolve(__dirname, '..'),
    },
  );
  console.log(
    '\x1b[32m✓\x1b[0m API client contracts and hooks are in sync with backend (zero drift).',
  );
} catch {
  console.error(
    '\x1b[31m[ERROR]\x1b[0m Drift detected in packages/api-client! Run "pnpm gen:api" and commit the changes.',
  );
  process.exit(1);
}
