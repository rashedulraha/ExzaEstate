import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transformSync } from '@swc/core';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (
      specifier.endsWith('.js') &&
      (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/'))
    ) {
      const tsSpecifier = specifier.replace(/\.js$/, '.ts');
      try {
        return await nextResolve(tsSpecifier, context);
      } catch {
        // Fall back to original error
      }
    }
    throw err;
  }
}

export async function load(url, context, nextLoad) {
  if (url.startsWith('file:') && url.endsWith('.ts') && !url.includes('/node_modules/')) {
    const filePath = fileURLToPath(url);
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { code } = transformSync(raw, {
      filename: filePath,
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
          dynamicImport: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
        target: 'es2022',
      },
      module: {
        type: 'es6',
      },
      sourceMaps: 'inline',
    });
    return {
      format: 'module',
      shortCircuit: true,
      source: code,
    };
  }
  return nextLoad(url, context);
}
