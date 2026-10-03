#!/usr/bin/env node

/**
 * check-permission-decorators.mjs
 *
 * Scans all NestJS controller files to ensure every HTTP route is guarded:
 * either by @RequirePermission(...) or explicitly marked with @Public().
 *
 * Fails if any undecorated route is found (Deny by default - architecture.md §4.4, security.md §2).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_SRC_DIR = path.resolve(ROOT_DIR, 'apps/backend/src');

// Exempt identity session routes (inherent to any authenticated user, no specific business role permission)
const EXEMPT_SESSION_ROUTES = new Set([
  'AuthController.logout',
  'AuthController.getMe',
  'AuthController.stepUp',
  'AuthController.generate2Fa',
  'AuthController.enable2Fa',
  'AuthController.disable2Fa',
  'HealthController.check',
]);

const HTTP_METHOD_REGEX = /@(Get|Post|Put|Patch|Delete)\s*\(/;
const REQUIRE_PERM_REGEX = /@RequirePermission\s*\(/;
const PUBLIC_REGEX = /@Public\s*\(/;

function isRouteGuarded(decorators, className, methodName, isClassPublic) {
  const routeIdentifier = `${className}.${methodName}`;
  const hasRequirePerm = decorators.some((d) => REQUIRE_PERM_REGEX.test(d));
  const hasPublic = isClassPublic || decorators.some((d) => PUBLIC_REGEX.test(d));
  const isExempt = EXEMPT_SESSION_ROUTES.has(routeIdentifier);

  return hasRequirePerm || hasPublic || isExempt;
}

function shouldResetDecorators(line) {
  if (line.startsWith('@') || line.length === 0) return false;
  return !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*');
}

export function checkControllerContent(filePath, content) {
  const violations = [];
  let totalRoutes = 0;

  const isClassPublic = PUBLIC_REGEX.test(content.split('export class')[0] || '');
  const classMatch = content.match(/export\s+class\s+(\w+)/);
  const className = classMatch ? classMatch[1] : path.basename(filePath);

  const lines = content.split('\n');
  let currentDecorators = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('@')) {
      currentDecorators.push(line);
      continue;
    }

    const isHttpMethod = currentDecorators.some((d) => HTTP_METHOD_REGEX.test(d));

    if (isHttpMethod) {
      const methodMatch = line.match(/(?:async\s+)?(\w+)\s*\(/);
      if (methodMatch) {
        totalRoutes++;
        const methodName = methodMatch[1];
        if (!isRouteGuarded(currentDecorators, className, methodName, isClassPublic)) {
          violations.push({
            file: filePath,
            className,
            methodName,
            line: i + 1,
          });
        }
      }
      currentDecorators = [];
    } else if (shouldResetDecorators(line)) {
      currentDecorators = [];
    }
  }

  return { totalRoutes, violations };
}

export function scanControllers(dir) {
  const allViolations = [];
  let totalScannedRoutes = 0;

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.controller.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const { totalRoutes, violations } = checkControllerContent(fullPath, content);
        totalScannedRoutes += totalRoutes;
        allViolations.push(...violations);
      }
    }
  }

  walk(dir);
  return { totalRoutes: totalScannedRoutes, violations: allViolations };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : BACKEND_SRC_DIR;
  const { totalRoutes, violations } = scanControllers(targetDir);

  if (violations.length > 0) {
    console.error(
      `\n❌ Found ${violations.length} route(s) lacking @RequirePermission or @Public:`,
    );
    for (const v of violations) {
      console.error(
        `   - ${path.relative(ROOT_DIR, v.file)}:${v.line} -> ${v.className}.${v.methodName}`,
      );
    }
    process.exit(1);
  } else {
    console.log(`✓ All ${totalRoutes} route(s) have @RequirePermission or @Public decorators.`);
    process.exit(0);
  }
}
