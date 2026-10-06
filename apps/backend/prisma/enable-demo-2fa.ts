import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://exza_app:exza_app_secret@localhost:5432/exzaestate?schema=public';
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
