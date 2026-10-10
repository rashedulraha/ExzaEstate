import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import path from 'node:path';

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.resolve(process.cwd(), '.env'));
  } catch {}
  try {
    process.loadEnvFile(path.resolve(process.cwd(), '../../.env'));
  } catch {}
}

async function main() {
  const connectionString = process.env.SYSTEM_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('FATAL: DATABASE_URL is missing. Please define it in your .env file.');
  }
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const res = await prisma.user.updateMany({
      data: {
        isTwoFactorEnabled: true,
      },
    });
    console.log(`Successfully updated ${res.count} users with isTwoFactorEnabled = true`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
