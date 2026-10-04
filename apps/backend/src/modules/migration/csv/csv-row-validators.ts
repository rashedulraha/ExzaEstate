import type { CsvRowError } from './csv-migration.types.js';

export function validateCustomerRow(
  rowNumber: number,
  data: Record<string, string>,
  seenPhones: Set<string>,
): CsvRowError[] {
  const errors: CsvRowError[] = [];
  const name = data['name']?.trim() ?? '';
  const phone = data['phone']?.trim() ?? '';
  const email = data['email']?.trim() ?? '';
  const type = (data['customer_type']?.trim() ?? 'INDIVIDUAL').toUpperCase();

  if (!name) {
    errors.push({ rowNumber, field: 'name', code: 'REQUIRED', message: 'Customer name is required' });
  }

  if (!phone) {
    errors.push({ rowNumber, field: 'phone', code: 'REQUIRED', message: 'Phone number is required' });
  } else if (!/^(\+?\d{8,15})$/.test(phone.replace(/[\s-]/g, ''))) {
    errors.push({ rowNumber, field: 'phone', code: 'INVALID_FORMAT', message: 'Invalid phone number format' });
  } else if (seenPhones.has(phone)) {
    errors.push({ rowNumber, field: 'phone', code: 'DUPLICATE_ROW', message: `Duplicate phone number in CSV: ${phone}` });
  } else {
    seenPhones.add(phone);
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ rowNumber, field: 'email', code: 'INVALID_FORMAT', message: 'Invalid email address' });
  }

  if (type && !['INDIVIDUAL', 'COMPANY'].includes(type)) {
    errors.push({ rowNumber, field: 'customer_type', code: 'INVALID_ENUM', message: 'customer_type must be INDIVIDUAL or COMPANY' });
  }

  return errors;
}

export function validatePropertyRow(
  rowNumber: number,
  data: Record<string, string>,
  seenCodes: Set<string>,
): CsvRowError[] {
  const errors: CsvRowError[] = [];
  const projectCode = data['project_code']?.trim() ?? '';
  const propertyCode = data['property_code']?.trim() ?? '';
  const type = (data['type']?.trim() ?? '').toUpperCase();
  const areaSqft = parseFloat(data['area_sqft']?.trim() ?? '');
  const basePriceStr = data['base_price_paisa']?.trim() ?? '';

  if (!projectCode) {
    errors.push({ rowNumber, field: 'project_code', code: 'REQUIRED', message: 'project_code is required' });
  }

  if (!propertyCode) {
    errors.push({ rowNumber, field: 'property_code', code: 'REQUIRED', message: 'property_code is required' });
  } else if (seenCodes.has(propertyCode)) {
    errors.push({ rowNumber, field: 'property_code', code: 'DUPLICATE_ROW', message: `Duplicate property_code in CSV: ${propertyCode}` });
  } else {
    seenCodes.add(propertyCode);
  }

  const validTypes = ['PLOT', 'FLAT', 'SHOP', 'OFFICE', 'PARKING'];
  if (!type || !validTypes.includes(type)) {
    errors.push({ rowNumber, field: 'type', code: 'INVALID_ENUM', message: `Type must be one of: ${validTypes.join(', ')}` });
  }

  if (isNaN(areaSqft) || areaSqft <= 0) {
    errors.push({ rowNumber, field: 'area_sqft', code: 'INVALID_NUMERIC', message: 'area_sqft must be a positive number' });
  }

  if (!basePriceStr || !/^\d+$/.test(basePriceStr)) {
    errors.push({ rowNumber, field: 'base_price_paisa', code: 'INVALID_NUMERIC', message: 'base_price_paisa must be a non-negative integer' });
  }

  return errors;
}

export function validateLeadRow(
  rowNumber: number,
  data: Record<string, string>,
): CsvRowError[] {
  const errors: CsvRowError[] = [];
  const name = data['name']?.trim() ?? '';
  const phone = data['phone']?.trim() ?? '';
  const source = data['source']?.trim() ?? '';
  const budgetStr = data['budget_paisa']?.trim() ?? '';

  if (!name) {
    errors.push({ rowNumber, field: 'name', code: 'REQUIRED', message: 'Lead name is required' });
  }

  if (!phone) {
    errors.push({ rowNumber, field: 'phone', code: 'REQUIRED', message: 'Phone number is required' });
  }

  if (!source) {
    errors.push({ rowNumber, field: 'source', code: 'REQUIRED', message: 'Lead source is required' });
  }

  if (budgetStr && !/^\d+$/.test(budgetStr)) {
    errors.push({ rowNumber, field: 'budget_paisa', code: 'INVALID_NUMERIC', message: 'budget_paisa must be an integer' });
  }

  return errors;
}

export function validateOpeningBalanceRow(
  rowNumber: number,
  data: Record<string, string>,
): CsvRowError[] {
  const errors: CsvRowError[] = [];
  const accountCode = data['account_code']?.trim() ?? '';
  const debitStr = data['debit_paisa']?.trim() ?? '0';
  const creditStr = data['credit_paisa']?.trim() ?? '0';

  if (!accountCode) {
    errors.push({ rowNumber, field: 'account_code', code: 'REQUIRED', message: 'account_code is required' });
  }

  if (!/^\d+$/.test(debitStr) || !/^\d+$/.test(creditStr)) {
    errors.push({ rowNumber, field: 'debit_paisa', code: 'INVALID_NUMERIC', message: 'debit_paisa and credit_paisa must be non-negative integers' });
  } else {
    const debit = BigInt(debitStr);
    const credit = BigInt(creditStr);
    if (debit > 0n && credit > 0n) {
      errors.push({ rowNumber, field: 'debit_paisa', code: 'MUTUALLY_EXCLUSIVE', message: 'A line cannot have both debit and credit greater than zero' });
    }
    if (debit === 0n && credit === 0n) {
      errors.push({ rowNumber, field: 'debit_paisa', code: 'ZERO_AMOUNT', message: 'Either debit or credit must be greater than zero' });
    }
  }

  return errors;
}

export function validateLegacyBookingRow(
  rowNumber: number,
  data: Record<string, string>,
  seenBookingNumbers: Set<string>,
): CsvRowError[] {
  const errors: CsvRowError[] = [];
  const bookingNumber = data['booking_number']?.trim() ?? '';
  const customerPhone = data['customer_phone']?.trim() ?? '';
  const customerName = data['customer_name']?.trim() ?? '';
  const propertyCode = data['property_code']?.trim() ?? '';
  const netPriceStr = data['net_price_paisa']?.trim() ?? '';
  const totalPaidStr = data['total_paid_paisa']?.trim() ?? '0';

  if (!bookingNumber) {
    errors.push({ rowNumber, field: 'booking_number', code: 'REQUIRED', message: 'booking_number is required' });
  } else if (seenBookingNumbers.has(bookingNumber)) {
    errors.push({ rowNumber, field: 'booking_number', code: 'DUPLICATE_ROW', message: `Duplicate booking_number in CSV: ${bookingNumber}` });
  } else {
    seenBookingNumbers.add(bookingNumber);
  }

  if (!customerPhone) {
    errors.push({ rowNumber, field: 'customer_phone', code: 'REQUIRED', message: 'customer_phone is required' });
  }

  if (!customerName) {
    errors.push({ rowNumber, field: 'customer_name', code: 'REQUIRED', message: 'customer_name is required' });
  }

  if (!propertyCode) {
    errors.push({ rowNumber, field: 'property_code', code: 'REQUIRED', message: 'property_code is required' });
  }

  if (!netPriceStr || !/^\d+$/.test(netPriceStr) || BigInt(netPriceStr) <= 0n) {
    errors.push({ rowNumber, field: 'net_price_paisa', code: 'INVALID_NUMERIC', message: 'net_price_paisa must be a positive integer' });
  }

  if (!/^\d+$/.test(totalPaidStr)) {
    errors.push({ rowNumber, field: 'total_paid_paisa', code: 'INVALID_NUMERIC', message: 'total_paid_paisa must be a non-negative integer' });
  } else if (netPriceStr && /^\d+$/.test(netPriceStr) && BigInt(totalPaidStr) > BigInt(netPriceStr)) {
    errors.push({ rowNumber, field: 'total_paid_paisa', code: 'EXCEEDS_PRICE', message: 'total_paid_paisa cannot exceed net_price_paisa' });
  }

  return errors;
}
