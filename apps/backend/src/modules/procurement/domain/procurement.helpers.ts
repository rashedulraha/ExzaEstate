export interface PrLineCalculation {
  itemDescription: string;
  category: string;
  quantity: string;
  unit: string;
  estimatedUnitPricePaisa: bigint;
  estimatedAmountPaisa: bigint;
  notes?: string;
}

export function calculatePrLines(
  lines: Array<{
    itemDescription: string;
    category?: string;
    quantity: string;
    unit?: string;
    estimatedUnitPricePaisa: string;
    notes?: string;
  }>,
): { computedLines: PrLineCalculation[]; totalEstimatedPaisa: bigint } {
  let total = 0n;
  const computedLines: PrLineCalculation[] = lines.map((line) => {
    const qty = parseFloat(line.quantity) || 0;
    const unitPrice = BigInt(line.estimatedUnitPricePaisa || '0');
    const amount = BigInt(Math.round(qty * Number(unitPrice)));
    total += amount;

    return {
      itemDescription: line.itemDescription,
      category: line.category ?? 'GENERAL',
      quantity: line.quantity,
      unit: line.unit ?? 'PCS',
      estimatedUnitPricePaisa: unitPrice,
      estimatedAmountPaisa: amount,
      notes: line.notes,
    };
  });

  return { computedLines, totalEstimatedPaisa: total };
}

export interface PoLineCalculation {
  prLineId?: string;
  itemDescription: string;
  category: string;
  quantity: string;
  unit: string;
  unitPricePaisa: bigint;
  totalAmountPaisa: bigint;
  notes?: string;
}

export function calculatePoLines(
  lines: Array<{
    prLineId?: string;
    itemDescription: string;
    category?: string;
    quantity: string;
    unit?: string;
    unitPricePaisa: string;
    notes?: string;
  }>,
): { computedLines: PoLineCalculation[]; totalAmountPaisa: bigint } {
  let total = 0n;
  const computedLines: PoLineCalculation[] = lines.map((line) => {
    const qty = parseFloat(line.quantity) || 0;
    const unitPrice = BigInt(line.unitPricePaisa || '0');
    const amount = BigInt(Math.round(qty * Number(unitPrice)));
    total += amount;

    return {
      prLineId: line.prLineId,
      itemDescription: line.itemDescription,
      category: line.category ?? 'GENERAL',
      quantity: line.quantity,
      unit: line.unit ?? 'PCS',
      unitPricePaisa: unitPrice,
      totalAmountPaisa: amount,
      notes: line.notes,
    };
  });

  return { computedLines, totalAmountPaisa: total };
}

export interface GrnLineCalculation {
  poLineId?: string;
  itemDescription: string;
  receivedQuantity: string;
  acceptedQuantity: string;
  rejectedQuantity: string;
  unit: string;
  unitPricePaisa: bigint;
  totalAmountPaisa: bigint;
  rejectionReason?: string;
  notes?: string;
}

export function calculateGrnLines(
  lines: Array<{
    poLineId?: string;
    itemDescription: string;
    receivedQuantity: string;
    acceptedQuantity: string;
    rejectedQuantity?: string;
    unit?: string;
    unitPricePaisa: string;
    rejectionReason?: string;
    notes?: string;
  }>,
): { computedLines: GrnLineCalculation[]; totalAmountPaisa: bigint } {
  let total = 0n;
  const computedLines: GrnLineCalculation[] = lines.map((line) => {
    const acceptedQty = parseFloat(line.acceptedQuantity) || 0;
    const unitPrice = BigInt(line.unitPricePaisa || '0');
    const amount = BigInt(Math.round(acceptedQty * Number(unitPrice)));
    total += amount;

    return {
      poLineId: line.poLineId,
      itemDescription: line.itemDescription,
      receivedQuantity: line.receivedQuantity,
      acceptedQuantity: line.acceptedQuantity,
      rejectedQuantity: line.rejectedQuantity ?? '0.00',
      unit: line.unit ?? 'PCS',
      unitPricePaisa: unitPrice,
      totalAmountPaisa: amount,
      rejectionReason: line.rejectionReason,
      notes: line.notes,
    };
  });

  return { computedLines, totalAmountPaisa: total };
}
