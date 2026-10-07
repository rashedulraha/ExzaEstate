import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DEFAULT_LAND_UNIT_FACTORS, convertArea, convertCompoundArea } from '@exzaestate/shared';
import { DemoSeedContext, DemoSeedStep } from '../demo-seed-step.interface.js';

interface DemoLandParcel {
  code: string;
  name: string;
  district: string;
  upazila: string;
  mouza: string;
  jlNumber: string;
  khatianNumber: string;
  dagNumber: string;
  deedNumber: string;
  deedDate: Date;
  recordedOwners: string;
  compoundArea?: Array<{ value: number; unit: 'KATHA' | 'DECIMAL' }>;
  enteredArea?: number;
  enteredUnit?: 'KATHA' | 'DECIMAL';
  purchasePricePaisa: bigint;
  legalCostPaisa: bigint;
  developmentCostPaisa: bigint;
  mutationStatus: string;
  taxStatus: string;
  ownershipStatus: string;
  latitude: number;
  longitude: number;
  remarks: string;
}

const DEMO_LAND_PARCELS: DemoLandParcel[] = [
  {
    code: 'LND-PUR-001',
    name: 'Purbachal Green City Land',
    district: 'Gazipur',
    upazila: 'Kaliganj',
    mouza: 'Nagari',
    jlNumber: 'JL-82',
    khatianNumber: 'RS-1420',
    dagNumber: 'CS-412, RS-883',
    deedNumber: 'DEED-2023-9912',
    deedDate: new Date('2023-04-12T00:00:00Z'),
    recordedOwners: 'Md. Anwar Hossain & Co.',
    compoundArea: [
      { value: 5, unit: 'KATHA' }, // 5 * 720 = 3600 sq ft
      { value: 3, unit: 'DECIMAL' }, // 3 * 435.6 = 1306.8 sq ft
    ],
    purchasePricePaisa: 1500000000n, // BDT 15,000,000 (1.5 Crore)
    legalCostPaisa: 50000000n, // BDT 500,000 (5 Lakh)
    developmentCostPaisa: 120000000n, // BDT 1,200,000 (12 Lakh)
    mutationStatus: 'COMPLETED',
    taxStatus: 'PAID_CURRENT_YEAR',
    ownershipStatus: 'FREEHOLD',
    latitude: 23.8821,
    longitude: 90.5184,
    remarks: 'Prime highway frontage parcel designated for residential development',
  },
  {
    code: 'LND-BRV-002',
    name: 'Bashundhara Riverview Extension',
    district: 'Dhaka',
    upazila: 'Keraniganj',
    mouza: 'Hasnabad',
    jlNumber: 'JL-15',
    khatianNumber: 'RS-304',
    dagNumber: 'CS-108, RS-901',
    deedNumber: 'DEED-2024-1102',
    deedDate: new Date('2024-01-20T00:00:00Z'),
    recordedOwners: 'Exza Living Real Estate Ltd',
    enteredArea: 10,
    enteredUnit: 'KATHA', // 10 * 720 = 7200 sq ft
    purchasePricePaisa: 3500000000n, // BDT 35,000,000 (3.5 Crore)
    legalCostPaisa: 80000000n, // BDT 800,000 (8 Lakh)
    developmentCostPaisa: 250000000n, // BDT 2,500,000 (25 Lakh)
    mutationStatus: 'COMPLETED',
    taxStatus: 'PAID_CURRENT_YEAR',
    ownershipStatus: 'FREEHOLD',
    latitude: 23.6842,
    longitude: 90.4318,
    remarks: 'River-adjacent land parcel intended for luxury high-rise condominium',
  },
];

@Injectable()
export class DemoLandStep implements DemoSeedStep {
  private readonly logger = new Logger(DemoLandStep.name);
  readonly name = 'DemoLandStep';
  readonly order = 20;

  async execute(ctx: DemoSeedContext, tx: Prisma.TransactionClient): Promise<void> {
    for (const parcel of DEMO_LAND_PARCELS) {
      let areaSqft: string;
      let enteredArea: string | null = null;
      let enteredUnit: string | null = null;

      if (parcel.compoundArea) {
        areaSqft = convertCompoundArea(parcel.compoundArea, DEFAULT_LAND_UNIT_FACTORS);
        enteredUnit = parcel.compoundArea.map((p) => `${p.value} ${p.unit}`).join(' + ');
      } else if (parcel.enteredArea && parcel.enteredUnit) {
        areaSqft = convertArea(parcel.enteredArea, parcel.enteredUnit, DEFAULT_LAND_UNIT_FACTORS);
        enteredArea = parcel.enteredArea.toString();
        enteredUnit = parcel.enteredUnit;
      } else {
        areaSqft = '7200.0000';
      }

      const existing = await tx.land.findFirst({
        where: {
          companyId: ctx.companyId,
          code: parcel.code,
          deletedAt: null,
        },
      });

      const landData = {
        name: parcel.name,
        district: parcel.district,
        upazila: parcel.upazila,
        mouza: parcel.mouza,
        jlNumber: parcel.jlNumber,
        khatianNumber: parcel.khatianNumber,
        dagNumber: parcel.dagNumber,
        deedNumber: parcel.deedNumber,
        deedDate: parcel.deedDate,
        recordedOwners: parcel.recordedOwners,
        areaSqft: new Prisma.Decimal(areaSqft),
        enteredArea: enteredArea ? new Prisma.Decimal(enteredArea) : null,
        enteredUnit,
        purchasePricePaisa: parcel.purchasePricePaisa,
        legalCostPaisa: parcel.legalCostPaisa,
        developmentCostPaisa: parcel.developmentCostPaisa,
        mutationStatus: parcel.mutationStatus,
        taxStatus: parcel.taxStatus,
        ownershipStatus: parcel.ownershipStatus,
        status: 'ACTIVE',
        latitude: new Prisma.Decimal(parcel.latitude.toString()),
        longitude: new Prisma.Decimal(parcel.longitude.toString()),
        remarks: parcel.remarks,
      };

      let landId: string;
      if (existing) {
        await tx.land.update({
          where: { id: existing.id },
          data: landData,
        });
        landId = existing.id;
      } else {
        const created = await tx.land.create({
          data: {
            companyId: ctx.companyId,
            code: parcel.code,
            ...landData,
          },
        });
        landId = created.id;
      }

      ctx.state.set(`land:${parcel.code}`, landId);
      this.logger.log(`Seeded demo land parcel ${parcel.code} (${parcel.name})`);
    }
  }
}
