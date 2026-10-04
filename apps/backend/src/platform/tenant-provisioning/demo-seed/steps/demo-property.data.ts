import { PROPERTY_STATUSES, PropertyStatus } from '@exzaestate/shared';

export interface DemoUnitDef {
  code: string;
  title: string;
  type: string;
  status: PropertyStatus;
  areaSqft: number;
  facing: string;
  basePricePaisa: bigint;
  premiumPaisa: bigint;
  discountLimitPct: number;
  ownerType?: string;
  holdExpiresAt?: Date;
  blockReason?: string;
  description: string;
}

export interface DemoFloorDef {
  code: string;
  name: string;
  floorNumber?: number;
  type: string;
  description: string;
  units: DemoUnitDef[];
}

export interface DemoBlockDef {
  code: string;
  name: string;
  type: string;
  description: string;
  floors: DemoFloorDef[];
}

export function buildPurbachalBlocks(): DemoBlockDef[] {
  const blocks: DemoBlockDef[] = [
    {
      code: 'BLK-A',
      name: 'ব্লক এ (লেকভিউ এভিনিউ)',
      type: 'BLOCK',
      description: 'Lake facing',
      floors: [],
    },
    {
      code: 'BLK-B',
      name: 'ব্লক বি (সেন্ট্রাল পার্ক)',
      type: 'BLOCK',
      description: 'Park facing',
      floors: [],
    },
    {
      code: 'BLK-C',
      name: 'ব্লক সি (গ্রীন ভ্যালি)',
      type: 'BLOCK',
      description: 'Valley zone',
      floors: [],
    },
  ];

  const statuses: PropertyStatus[] = [
    PROPERTY_STATUSES.AVAILABLE,
    PROPERTY_STATUSES.BOOKED,
    PROPERTY_STATUSES.AVAILABLE,
    PROPERTY_STATUSES.SOLD,
    PROPERTY_STATUSES.RESERVED,
    PROPERTY_STATUSES.HOLD,
    PROPERTY_STATUSES.AVAILABLE,
    PROPERTY_STATUSES.BLOCKED,
    PROPERTY_STATUSES.AVAILABLE,
    PROPERTY_STATUSES.BOOKED,
  ];

  blocks.forEach((blk, bIdx) => {
    for (let r = 1; r <= 2; r++) {
      const roadCode = `RD-0${bIdx * 2 + r}`;
      const units: DemoUnitDef[] = [];
      for (let u = 1; u <= 5; u++) {
        const uIdx = (r - 1) * 5 + (u - 1);
        const status = statuses[uIdx] || PROPERTY_STATUSES.AVAILABLE;
        const code = `PLT-${blk.code.slice(-1)}-${r}0${u}`;
        units.push({
          code,
          title: `প্লট ${code}`,
          type: 'PLOT',
          status,
          areaSqft: u % 2 === 0 ? 3600.0 : 2160.0,
          facing: u % 2 === 0 ? 'SOUTH' : 'NORTH',
          basePricePaisa: 5000000000n + BigInt(u * 200000000),
          premiumPaisa: u === 1 ? 300000000n : 0n,
          discountLimitPct: 5.0,
          holdExpiresAt:
            status === PROPERTY_STATUSES.HOLD ? new Date(Date.now() + 7 * 86400000) : undefined,
          blockReason: status === PROPERTY_STATUSES.BLOCKED ? 'Utility substation area' : undefined,
          description: `Plot ${code} in ${blk.name}`,
        });
      }
      blk.floors.push({
        code: roadCode,
        name: `রোড ${roadCode.slice(-2)}`,
        type: 'ROAD',
        description: `Road ${roadCode}`,
        units,
      });
    }
  });

  return blocks;
}

export function buildRiverviewBlocks(): DemoBlockDef[] {
  const blocks: DemoBlockDef[] = [
    { code: 'TWR-1', name: 'টাওয়ার ১ (সুরমা)', type: 'TOWER', description: 'Tower 1', floors: [] },
    {
      code: 'TWR-2',
      name: 'টাওয়ার ২ (কর্ণফুলী)',
      type: 'TOWER',
      description: 'Tower 2',
      floors: [],
    },
  ];

  blocks.forEach((twr, tIdx) => {
    // Commercial / Ground Floor
    twr.floors.push({
      code: `FL-G-${tIdx + 1}`,
      name: 'গ্রাউন্ড ফ্লোর (বাণিজ্যিক)',
      floorNumber: 0,
      type: 'FLOOR',
      description: 'Ground retail shops',
      units: [
        {
          code: `SHP-G0${tIdx + 1}`,
          title: `দোকান জি-০${tIdx + 1}`,
          type: 'SHOP',
          status: PROPERTY_STATUSES.BOOKED,
          areaSqft: 750.0,
          facing: 'EAST',
          basePricePaisa: 1500000000n,
          premiumPaisa: 100000000n,
          discountLimitPct: 2.0,
          description: 'Corner shop',
        },
        {
          code: `SHP-G0${tIdx + 3}`,
          title: `দোকান জি-০${tIdx + 3}`,
          type: 'SHOP',
          status: PROPERTY_STATUSES.AVAILABLE,
          areaSqft: 650.0,
          facing: 'NORTH',
          basePricePaisa: 1300000000n,
          premiumPaisa: 0n,
          discountLimitPct: 3.0,
          description: 'Retail space',
        },
      ],
    });

    // Residential Floors 1 to 5
    for (let fl = 1; fl <= 5; fl++) {
      const units: DemoUnitDef[] = ['A', 'B', 'C'].map((letter, lIdx) => {
        const statuses = [
          PROPERTY_STATUSES.AVAILABLE,
          PROPERTY_STATUSES.BOOKED,
          PROPERTY_STATUSES.SOLD,
          PROPERTY_STATUSES.RESERVED,
        ];
        const status = statuses[(fl + lIdx) % statuses.length]!;
        const code = `FLT-${tIdx === 0 ? 'S' : 'K'}${fl}${letter}`;
        return {
          code,
          title: `অ্যাপার্টমেন্ট ${code}`,
          type: 'FLAT',
          status,
          areaSqft: 1650.0 + lIdx * 100,
          facing: lIdx === 0 ? 'SOUTH' : 'NORTH',
          basePricePaisa: 1200000000n + BigInt(fl * 20000000),
          premiumPaisa: lIdx === 0 ? 50000000n : 0n,
          discountLimitPct: 5.0,
          ownerType: fl === 3 && lIdx === 2 ? 'LANDOWNER' : 'COMPANY',
          description: `Apartment ${code} in ${twr.name}`,
        };
      });

      twr.floors.push({
        code: `FL-0${fl}-${tIdx + 1}`,
        name: `${fl}ম তলা`,
        floorNumber: fl,
        type: 'FLOOR',
        description: `Level ${fl}`,
        units,
      });
    }

    // Basement Parking
    twr.floors.push({
      code: `FL-B1-${tIdx + 1}`,
      name: 'বেজমেন্ট ১ (পার্কিং)',
      floorNumber: -1,
      type: 'FLOOR',
      description: 'Parking slots',
      units: [1, 2, 3].map((num) => ({
        code: `PRK-B${tIdx + 1}0${num}`,
        title: `পার্কিং স্লট ${num}`,
        type: 'PARKING',
        status: num === 1 ? PROPERTY_STATUSES.SOLD : PROPERTY_STATUSES.AVAILABLE,
        areaSqft: 150.0,
        facing: 'SOUTH',
        basePricePaisa: 50000000n,
        premiumPaisa: 0n,
        discountLimitPct: 0.0,
        description: 'Car parking',
      })),
    });
  });

  return blocks;
}
