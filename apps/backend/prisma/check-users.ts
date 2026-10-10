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
  const connectionString =
    process.env.MIGRATOR_DATABASE_URL ||
    process.env.SYSTEM_DATABASE_URL ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'FATAL: Database connection URL is missing. Please define MIGRATOR_DATABASE_URL or DATABASE_URL in your .env file.',
    );
  }
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const company = await prisma.company.findFirst({ where: { code: 'EXZA' } });
  console.log('COMPANY EXZA:', company);

  if (company) {
    const users = await prisma.user.findMany({ where: { companyId: company.id } });
    console.log(
      'EXZA USERS:',
      users.map((u) => ({ email: u.email, fullName: u.fullName })),
    );
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
