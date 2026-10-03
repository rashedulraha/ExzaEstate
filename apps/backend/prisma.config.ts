import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Load .env from backend directory or workspace root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export default defineConfig({
  schema: 'prisma/schema',
  datasource: {
    url: process.env.MIGRATOR_DATABASE_URL || process.env.DATABASE_URL || env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
