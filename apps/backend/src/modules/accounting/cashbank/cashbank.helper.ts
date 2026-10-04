export function resolveParentCode(accountType: string): string {
  if (accountType === 'CASH') {
    return '1010';
  }
  if (accountType === 'WALLET') {
    return '1030';
  }
  return '1020';
}

export function maskAccountNumber(acc?: string): string | null {
  if (!acc) return null;
  const trimmed = acc.trim();
  if (trimmed.length <= 4) return '••••';
  const lastFour = trimmed.slice(-4);
  const maskLength = Math.max(4, trimmed.length - 4);
  return `${'•'.repeat(maskLength)}${lastFour}`;
}

export function resolveNextChildCode(parentCode: string, existingCodes: string[]): string {
  const prefix = `${parentCode}-`;
  const childNumbers = existingCodes
    .filter((code) => code.startsWith(prefix))
    .map((code) => {
      const suffix = code.substring(prefix.length);
      const parsed = parseInt(suffix, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    });

  const nextNumber = childNumbers.length > 0 ? Math.max(...childNumbers) + 1 : 1;
  const padded = nextNumber.toString().padStart(2, '0');
  return `${prefix}${padded}`;
}

export function computeBalancePaisa(
  lines: Array<{ debitPaisa: bigint; creditPaisa: bigint }>,
  initialBalance: bigint = 0n,
): bigint {
  let balance = initialBalance;
  for (const line of lines) {
    balance += line.debitPaisa - line.creditPaisa;
  }
  return balance;
}
