import path from 'node:path';
import { defineConfig } from 'prisma/config';

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.resolve(process.cwd(), '.env'));
  } catch {}
  try {
    process.loadEnvFile(path.resolve(process.cwd(), '../../.env'));
  } catch {}
}

const datasourceUrl = process.env.MIGRATOR_DATABASE_URL || process.env.DATABASE_URL;

if (!datasourceUrl) {
  throw new Error(
    'FATAL: Database connection URL is missing. Please define MIGRATOR_DATABASE_URL or DATABASE_URL in your .env file.',
  );
}

export default defineConfig({
  schema: 'prisma/schema',
  datasource: {
    url: datasourceUrl,
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
