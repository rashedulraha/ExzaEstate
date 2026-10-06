import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

async function main() {
  const connectionString =
    process.env.MIGRATOR_DATABASE_URL ||
    'postgresql://exza_migrator:exza_migrator_secret@localhost:5432/exzaestate?schema=public';
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Sanitizing company and user names to clean English...');

  // 1. Update company name
  const companyUpdate = await prisma.company.updateMany({
    where: { code: 'EXZA' },
    data: {
      name: 'ExzaEstate Development Ltd.',
    },
  });
  console.log(`Updated ${companyUpdate.count} company record(s) to "ExzaEstate Development Ltd."`);

  // 2. Update users
  const userUpdates: Record<string, string> = {
    'md@exzaestate.com': 'Anwar Hossain',
    'gm@exzaestate.com': 'Mohammad Rafiq',
    'accountant@exzaestate.com': 'Farhana Haque',
    'executive@exzaestate.com': 'Tanveer Ahmed',
    'executive2@exzaestate.com': 'Nusrat Jahan',
  };

  for (const [email, fullName] of Object.entries(userUpdates)) {
    const res = await prisma.user.updateMany({
      where: { email },
      data: { fullName },
    });
    console.log(`Updated user ${email} to "${fullName}" (${res.count} updated)`);
  }

  // Also clean up any employee records designations if any contain non-ASCII
  const employees = await prisma.employee.findMany();
  for (const emp of employees) {
    const cleanDesignation = emp.designation.replace(/[\u0980-\u09FF]/g, '').trim();
    if (cleanDesignation && cleanDesignation !== emp.designation) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { designation: cleanDesignation },
      });
    }
  }

  await prisma.$disconnect();
  await pool.end();
  console.log('Database sanitization completed successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
