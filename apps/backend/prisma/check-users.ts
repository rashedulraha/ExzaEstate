import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

async function main() {
  const connectionString =
    'postgresql://exza_migrator:exza_migrator_secret@localhost:5432/exzaestate?schema=public';
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
