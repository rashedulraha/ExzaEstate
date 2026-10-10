import path from 'node:path';
import pg from 'pg';

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.resolve(process.cwd(), '.env'));
  } catch {}
  try {
    process.loadEnvFile(path.resolve(process.cwd(), '../../.env'));
  } catch {}
}

const connectionString =
  process.env.MIGRATOR_DATABASE_URL || process.env.SYSTEM_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'FATAL: Database connection URL is missing. Please define MIGRATOR_DATABASE_URL, SYSTEM_DATABASE_URL, or DATABASE_URL in your .env file.',
  );
}

const CATALOG_EVENTS_SQL = `
INSERT INTO notification_event_catalog (code, name, module, description, default_channels)
VALUES
  ('booking.requested', 'Booking Requested', 'booking', 'New booking request submitted for review', ARRAY['IN_APP']),
  ('booking.confirmed', 'Booking Confirmed', 'booking', 'Booking confirmed for customer and property', ARRAY['IN_APP']),
  ('booking.cancelled', 'Booking Cancelled', 'booking', 'Booking cancellation finalized', ARRAY['IN_APP']),
  ('installment.due', 'Installment Due', 'installment', 'Upcoming installment due date alert', ARRAY['IN_APP']),
  ('installment.overdue', 'Installment Overdue', 'installment', 'Installment overdue notice', ARRAY['IN_APP']),
  ('payment.received', 'Payment Received', 'payment', 'Payment draft or receipt recorded', ARRAY['IN_APP']),
  ('payment.posted', 'Payment Posted', 'payment', 'Payment officially posted to accounts', ARRAY['IN_APP']),
  ('payment.bounced', 'Payment Cheque Bounced', 'payment', 'Payment cheque bounced notification', ARRAY['IN_APP']),
  ('refund.requested', 'Refund Requested', 'refund', 'Customer refund requested for review', ARRAY['IN_APP']),
  ('approval.requested', 'Approval Requested', 'approval', 'Pending approval required for action', ARRAY['IN_APP']),
  ('approval.granted', 'Approval Granted', 'approval', 'Action approval granted', ARRAY['IN_APP']),
  ('approval.rejected', 'Approval Rejected', 'approval', 'Action approval rejected', ARRAY['IN_APP']),
  ('document.expiry_alert', 'Document Expiry Alert', 'documents', 'Document validity expiring soon alert', ARRAY['IN_APP']),
  ('lead.created', 'Lead Created', 'crm', 'New sales lead assigned', ARRAY['IN_APP']),
  ('lead.contacted', 'Lead Contacted', 'crm', 'Follow-up logged for sales lead', ARRAY['IN_APP']),
  ('follow_up.overdue', 'Follow-up Overdue', 'crm', 'Scheduled follow-up is overdue', ARRAY['IN_APP']),
  ('security.event', 'Security Alert', 'security', 'Security event or login anomaly detected', ARRAY['IN_APP'])
ON CONFLICT (code) DO NOTHING;
`;

async function main() {
  console.log('====================================================');
  console.log('       ExzaEstate 1-Click Database Clean Utility     ');
  console.log('====================================================');
  console.log('Connecting to PostgreSQL database...');
  const pool = new pg.Pool({ connectionString });

  try {
    const client = await pool.connect();
    try {
      // Find all user tables except migration tracking and system catalogues
      const res = await client.query<{ tablename: string }>(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename NOT IN ('_prisma_migrations', 'notification_event_catalog');
      `);

      const tables = res.rows.map((r) => r.tablename);
      if (tables.length === 0) {
        console.log('No application tables found to truncate.');
        return;
      }

      console.log(`Found ${tables.length} tables. Truncating all application data...`);
      const truncateQuery = `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(', ')} CASCADE;`;
      await client.query(truncateQuery);

      // Ensure catalog events are present
      await client.query(CATALOG_EVENTS_SQL);

      console.log('✓ All mock/test/demo data successfully deleted!');
      console.log('✓ Database schema, migrations & system event catalogues intact.');
      console.log('✓ Database is now 100% clean, empty, and ready for production.');
      console.log('====================================================');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('✗ Failed to clean database:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
