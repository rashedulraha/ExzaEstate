import madge from 'madge';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

async function main() {
  console.log('Running circular dependency check across apps and packages...');

  const targets = [path.join(rootDir, 'apps'), path.join(rootDir, 'packages')].filter((p) =>
    fs.existsSync(p),
  );

  let hasCycles = false;

  for (const target of targets) {
    const res = await madge(target, {
      baseDir: rootDir,
      fileExtensions: ['ts', 'tsx', 'js', 'jsx', 'cjs', 'mjs'],
      excludeRegExp: [/node_modules/, /\.turbo/, /dist/, /build/, /coverage/, /\.git/],
    });

    const circular = res.circular();
    if (circular.length > 0) {
      console.error(`Circular dependencies detected in ${target}:`);
      console.error(JSON.stringify(circular, null, 2));
      hasCycles = true;
    }
  }

  if (hasCycles) {
    process.exit(1);
  }

  console.log('✓ Zero circular dependencies found.');
}

main().catch((err) => {
  console.error('Error running circular dependency check:', err);
  process.exit(1);
});
