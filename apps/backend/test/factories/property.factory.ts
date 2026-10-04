import { Prisma } from '@prisma/client';
import { PROPERTY_STATUSES } from '@exzaestate/shared';

export type CreatePropertyBlockFixture = Prisma.PropertyBlockUncheckedCreateInput;
export type CreatePropertyFloorFixture = Prisma.PropertyFloorUncheckedCreateInput;
export type CreatePropertyFixture = Prisma.PropertyUncheckedCreateInput;

export function buildPropertyBlockFixture(
  overrides: Partial<CreatePropertyBlockFixture> & { companyId: string; projectId: string },
): CreatePropertyBlockFixture {
  const code = overrides.code || `BLK-${Date.now().toString().slice(-4)}`;
  return {
    type: 'BLOCK',
    description: 'Standard residential block',
    ...overrides,
    code,
    name: overrides.name || `Block ${code}`,
  };
}

export function buildPropertyFloorFixture(
  overrides: Partial<CreatePropertyFloorFixture> & {
    companyId: string;
    projectId: string;
    blockId: string;
  },
): CreatePropertyFloorFixture {
  const code = overrides.code || `FL-${Date.now().toString().slice(-3)}`;
  return {
    floorNumber: 1,
    type: 'FLOOR',
    description: 'Standard level',
    ...overrides,
    code,
    name: overrides.name || `Floor ${code}`,
  };
}

const PROPERTY_DEFAULTS: Omit<CreatePropertyFixture, 'companyId' | 'projectId' | 'code'> = {
  type: 'FLAT',
  status: PROPERTY_STATUSES.AVAILABLE,
  areaSqft: 1450.0,
  facing: 'SOUTH',
  basePricePaisa: 1000000000n, // 1 Crore BDT
  premiumPaisa: 0n,
  discountLimitPct: 5.0,
  netPricePaisa: 1000000000n,
  ownerType: 'COMPANY',
};

export function buildPropertyFixture(
  overrides: Partial<CreatePropertyFixture> & { companyId: string; projectId: string },
): CreatePropertyFixture {
  const code = overrides.code || `PROP-${Date.now().toString().slice(-5)}`;
  const basePricePaisa = (overrides.basePricePaisa ?? PROPERTY_DEFAULTS.basePricePaisa) as bigint;
  const premiumPaisa = (overrides.premiumPaisa ?? PROPERTY_DEFAULTS.premiumPaisa) as bigint;
  const netPricePaisa = overrides.netPricePaisa || basePricePaisa + premiumPaisa;

  return {
    ...PROPERTY_DEFAULTS,
    ...overrides,
    code,
    title: overrides.title || `Unit ${code}`,
    basePricePaisa,
    premiumPaisa,
    netPricePaisa,
  };
}
