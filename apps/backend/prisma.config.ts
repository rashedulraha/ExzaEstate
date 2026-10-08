import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema',
  datasource: {
    url:
      process.env.MIGRATOR_DATABASE_URL ||
      process.env.DATABASE_URL ||
      'postgresql://exza_admin:exza_admin_secret@localhost:5432/exzaestate?schema=public',
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
