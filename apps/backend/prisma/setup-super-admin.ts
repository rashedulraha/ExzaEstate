import pg from 'pg';
import argon2 from 'argon2';
import path from 'node:path';

// Load .env
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
    'postgresql://exza_migrator:exza_migrator_secret@localhost:5432/exzaestate?schema=public';

  console.log('Connecting to PostgreSQL database via migrator role...');
  const pool = new pg.Pool({ connectionString });

  try {
    // 1. Purge default and mock demo users
    console.log('Purging default and mock demo users from database...');

    // Cascades remove sessions, refresh_tokens, user_roles, user_branches, employees
    const deleteUsersResult = await pool.query('DELETE FROM users');
    console.log(`Deleted ${deleteUsersResult.rowCount ?? 0} mock / demo user(s).`);

    // Clean up temporary test companies if any exist (keep main clean)
    const deleteTestCompanies = await pool.query(`
      DELETE FROM companies 
      WHERE code LIKE 'INV-%' 
         OR code LIKE 'RST-%' 
         OR code LIKE 'PRJ%' 
         OR code LIKE 'ROLE%' 
         OR code LIKE 'USR%'
         OR code LIKE 'EXZAFLW%'
         OR code LIKE 'EXZASTG%'
         OR code LIKE 'EXZANUM%'
    `);
    console.log(`Cleaned up ${deleteTestCompanies.rowCount ?? 0} test company records.`);

    // 2. Hash Super Admin password
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'lDMBXtn9t3nOTa32@2026!';
    const passwordHash = await argon2.hash(superAdminPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const superAdminName = process.env.SUPER_ADMIN_NAME || 'Exzazon Team';
    const primaryEmail = (process.env.SUPER_ADMIN_EMAIL || 'exzazon.bd@gmail.com')
      .toLowerCase()
      .trim();
    const secondaryEmail = (process.env.SUPER_ADMIN_SECONDARY_EMAIL || 'rashedulraha.bd@gmail.com')
      .toLowerCase()
      .trim();

    // 3. Upsert Super Admins into system_admins table
    console.log('Registering Super Admin users in system_admins...');

    // Primary Admin
    await pool.query(
      `INSERT INTO system_admins (id, email, full_name, password_hash, status, is_two_factor_enabled, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'ACTIVE', false, now(), now())
       ON CONFLICT (email) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           password_hash = EXCLUDED.password_hash,
           status = 'ACTIVE',
           is_two_factor_enabled = false,
           updated_at = now()`,
      [primaryEmail, superAdminName, passwordHash],
    );
    console.log(`✓ Super Admin registered: ${primaryEmail} (${superAdminName})`);

    // Secondary Admin
    await pool.query(
      `INSERT INTO system_admins (id, email, full_name, password_hash, status, is_two_factor_enabled, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, 'ACTIVE', false, now(), now())
       ON CONFLICT (email) DO UPDATE
       SET full_name = EXCLUDED.full_name,
           password_hash = EXCLUDED.password_hash,
           status = 'ACTIVE',
           is_two_factor_enabled = false,
           updated_at = now()`,
      [secondaryEmail, superAdminName, passwordHash],
    );
    console.log(`✓ Super Admin registered: ${secondaryEmail} (${superAdminName})`);

    // Verify system_admins count
    const countRes = await pool.query('SELECT count(*) FROM system_admins');
    console.log(`Total active System Admins in platform realm: ${countRes.rows[0].count}`);

    console.log('Database cleanup and Super Admin setup completed successfully!');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
