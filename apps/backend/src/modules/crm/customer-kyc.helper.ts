export interface KycEvaluationTarget {
  customerType: string;
  name: string;
  phone: string;
  isNrb: boolean;
  nidEncrypted: string | null;
  passportEncrypted: string | null;
  tinEncrypted: string | null;
  addresses?: Array<{ type: string }>;
  nominees?: Array<{ id: string }>;
}

export interface KycEvaluationResult {
  isComplete: boolean;
  missingRequirements: string[];
}

function checkBasicIdentity(target: KycEvaluationTarget, missing: string[]): void {
  if (!target.name || target.name.trim().length === 0) {
    missing.push('Customer full name is required');
  }
  if (!target.phone || target.phone.trim().length === 0) {
    missing.push('Primary phone number is required');
  }
  const hasId = Boolean(target.nidEncrypted || target.passportEncrypted || target.tinEncrypted);
  if (!hasId) {
    missing.push('At least one Government ID (NID, Passport, or TIN) is required');
  }
}

function checkAddressesAndNominees(target: KycEvaluationTarget, missing: string[]): void {
  const addresses = target.addresses ?? [];
  if (addresses.length === 0) {
    missing.push('At least one address (Present, Permanent, or Office) is required');
  }
  if (target.customerType === 'INDIVIDUAL' && (!target.nominees || target.nominees.length === 0)) {
    missing.push('At least one registered nominee is required for individual customer');
  }
}

function checkNrbRequirements(target: KycEvaluationTarget, missing: string[]): void {
  if (!target.isNrb) return;
  const addresses = target.addresses ?? [];
  const hasPassport = Boolean(target.passportEncrypted);
  const hasOverseasAddress = addresses.some((a) => a.type === 'OVERSEAS');
  if (!hasPassport && !hasOverseasAddress) {
    missing.push('Non-Resident Bangladeshi (NRB) requires either a passport or overseas address');
  }
}

export function evaluateCustomerKyc(target: KycEvaluationTarget): KycEvaluationResult {
  const missing: string[] = [];
  checkBasicIdentity(target, missing);
  checkAddressesAndNominees(target, missing);
  checkNrbRequirements(target, missing);

  return {
    isComplete: missing.length === 0,
    missingRequirements: missing,
  };
}
