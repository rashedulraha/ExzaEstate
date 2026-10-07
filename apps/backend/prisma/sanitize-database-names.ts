import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

async function sanitizeUsers(prisma: PrismaClient) {
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
}

async function sanitizeEmployees(prisma: PrismaClient) {
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
}

async function sanitizeBranches(prisma: PrismaClient) {
  const branches = await prisma.branch.findMany();
  for (const b of branches) {
    const cleanBranch = b.name
      .replace(/\s*\([^)]*[\u0980-\u09FF][^)]*\)/g, '')
      .replace(/[\u0980-\u09FF]/g, '')
      .trim();
    if (cleanBranch && cleanBranch !== b.name) {
      await prisma.branch.update({
        where: { id: b.id },
        data: { name: cleanBranch },
      });
    }
  }
}

async function sanitizeProjects(prisma: PrismaClient) {
  const projects = await prisma.project.findMany();
  for (const p of projects) {
    const cleanProject = p.name
      .replace(/\s*\([^)]*[\u0980-\u09FF][^)]*\)/g, '')
      .replace(/[\u0980-\u09FF]/g, '')
      .trim();
    if (cleanProject && cleanProject !== p.name) {
      await prisma.project.update({
        where: { id: p.id },
        data: { name: cleanProject },
      });
    }
  }
}

async function sanitizeCompanies(prisma: PrismaClient) {
  const allCompanies = await prisma.company.findMany();
  for (const comp of allCompanies) {
    const cleanComp = comp.name
      .replace(/\s*\([^)]*[\u0980-\u09FF][^)]*\)/g, '')
      .replace(/[\u0980-\u09FF]/g, '')
      .trim();
    if (cleanComp && cleanComp !== comp.name) {
      await prisma.company.update({
        where: { id: comp.id },
        data: { name: cleanComp },
      });
    }
  }
}

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

  // 2. Update users, employees, branches, projects, and companies
  await sanitizeUsers(prisma);
  await sanitizeEmployees(prisma);
  await sanitizeBranches(prisma);
  await sanitizeProjects(prisma);
  await sanitizeCompanies(prisma);

  await prisma.$disconnect();
  await pool.end();
  console.log('Database sanitization completed successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
