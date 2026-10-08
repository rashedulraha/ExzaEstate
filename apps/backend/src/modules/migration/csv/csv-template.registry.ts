import type { CsvMigrationEntity, CsvTemplateDefinition } from './csv-migration.types.js';

export const CSV_TEMPLATES: Record<CsvMigrationEntity, { headers: string[]; sampleRow: string[] }> =
  {
    CUSTOMERS: {
      headers: [
        'name',
        'phone',
        'email',
        'customer_type',
        'nid',
        'passport',
        'tin',
        'father_or_spouse_name',
        'occupation',
        'address',
      ],
      sampleRow: [
        'Kazi Nazrul Islam',
        '+8801711223344',
        'nazrul@example.com',
        'INDIVIDUAL',
        '19901234567890123',
        '',
        '',
        'Kazi Fakir Ahmed',
        'Writer',
        'Dhanmondi, Dhaka',
      ],
    },
    PROPERTIES: {
      headers: ['project_code', 'property_code', 'type', 'area_sqft', 'base_price_paisa', 'status'],
      sampleRow: ['PRJ-001', 'A-101', 'FLAT', '1500', '750000000', 'Available'],
    },
    LEADS: {
      headers: [
        'name',
        'phone',
        'email',
        'source',
        'status',
        'preferred_property_type',
        'budget_paisa',
        'interest_notes',
      ],
      sampleRow: [
        'Shakib Al Hasan',
        '+8801811998877',
        'shakib@example.com',
        'FACEBOOK',
        'New',
        'FLAT',
        '1200000000',
        'Interested in 3-bedroom flat in Gulshan',
      ],
    },
    OPENING_BALANCES: {
      headers: ['account_code', 'debit_paisa', 'credit_paisa', 'narration'],
      sampleRow: ['1010', '500000000', '0', 'Opening Cash in Hand'],
    },
    LEGACY_BOOKINGS: {
      headers: [
        'booking_number',
        'customer_phone',
        'customer_name',
        'property_code',
        'booking_date',
        'net_price_paisa',
        'total_paid_paisa',
        'down_payment_paisa',
      ],
      sampleRow: [
        'LBKG-001',
        '+8801711223344',
        'Kazi Nazrul Islam',
        'A-101',
        '2025-01-15',
        '750000000',
        '250000000',
        '150000000',
      ],
    },
  };

export function getCsvTemplate(entity: CsvMigrationEntity): CsvTemplateDefinition {
  const def = CSV_TEMPLATES[entity];
  const headerLine = def.headers.join(',');
  const sampleLine = def.sampleRow.map((v) => (v.includes(',') ? `"${v}"` : v)).join(',');
  const csvContent = `${headerLine}\n${sampleLine}\n`;

  return {
    entity,
    headers: def.headers,
    sampleRow: def.sampleRow,
    csvContent,
  };
}
