import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { FieldCryptoService } from '../../../security/field-crypto.service.js';
import type { DemoSeedContext, DemoSeedStep } from '../demo-seed-step.interface.js';
import {
  DEMO_CUSTOMERS,
  type DemoCustomerDef,
  type DemoCustomerNomineeDef,
  type DemoCustomerCoBuyerDef,
} from './demo-customer.data.js';

@Injectable()
export class DemoCustomerStep implements DemoSeedStep {
  private readonly logger = new Logger(DemoCustomerStep.name);
  readonly name = 'DemoCustomerStep';
  readonly order = 55;

  constructor(private readonly fieldCrypto: FieldCryptoService) {}

  async execute(ctx: DemoSeedContext, tx: Prisma.TransactionClient): Promise<void> {
    const userMap = await this.getUserMap(ctx.companyId, tx);
    let createdCount = 0;

    for (const def of DEMO_CUSTOMERS) {
      const created = await this.seedCustomerIfMissing(ctx, tx, def, userMap);
      if (created) {
        createdCount++;
      }
    }

    this.logger.log(
      `Demo Customer seed completed: ${createdCount} customers created for company ${ctx.companyId}`,
    );
  }

  private async getUserMap(
    companyId: string,
    tx: Prisma.TransactionClient,
  ): Promise<Map<string, string>> {
    const users = await tx.user.findMany({
      where: { companyId, status: 'ACTIVE' },
      select: { id: true, email: true },
    });

    const userMap = new Map<string, string>();
    for (const u of users) {
      const prefix = u.email.split('@')[0]?.toLowerCase();
      if (prefix) {
        userMap.set(prefix, u.id);
      }
    }
    return userMap;
  }

  private async seedCustomerIfMissing(
    ctx: DemoSeedContext,
    tx: Prisma.TransactionClient,
    def: DemoCustomerDef,
    userMap: Map<string, string>,
  ): Promise<boolean> {
    const existing = await tx.customer.findFirst({
      where: {
        companyId: ctx.companyId,
        customerNumber: def.customerNumber,
        deletedAt: null,
      },
    });

    if (existing) {
      return false;
    }

    const assignedToId = def.assigneePrefix ? (userMap.get(def.assigneePrefix) ?? null) : null;
    const customer = await this.insertCustomer(ctx, tx, def, assignedToId);

    await this.seedCustomerRelations(ctx.companyId, customer.id, def, tx);
    return true;
  }

  private encryptField(val?: string | null): string | null {
    return val ? this.fieldCrypto.encrypt(val) : null;
  }

  private bidxField(val: string | null | undefined, companyId: string): string | null {
    return val ? this.fieldCrypto.blindIndex(val, companyId) : null;
  }

  private buildCustomerPii(def: DemoCustomerDef, companyId: string) {
    return {
      nidEncrypted: this.fieldCrypto.encrypt(def.nid),
      nidBidx: this.fieldCrypto.blindIndex(def.nid, companyId),
      passportEncrypted: this.encryptField(def.passport),
      passportBidx: this.bidxField(def.passport, companyId),
      tinEncrypted: this.encryptField(def.tin),
      tinBidx: this.bidxField(def.tin, companyId),
      bankAccountEncrypted: this.encryptField(def.bankAccount),
      bankAccountBidx: this.bidxField(def.bankAccount, companyId),
    };
  }

  private buildCustomerCore(def: DemoCustomerDef) {
    return {
      customerNumber: def.customerNumber,
      customerType: def.customerType,
      name: def.name,
      phone: def.phone,
      nationality: def.nationality ?? 'Bangladeshi',
      isNrb: def.isNrb ?? false,
    };
  }

  private buildCustomerFamilyAndBank(def: DemoCustomerDef) {
    return {
      fatherOrSpouseName: def.fatherOrSpouseName ?? null,
      motherName: def.motherName ?? null,
      dateOfBirth: def.dateOfBirth ? new Date(`${def.dateOfBirth}T00:00:00.000Z`) : null,
      occupation: def.occupation ?? null,
      email: def.email ?? null,
      bankName: def.bankName ?? null,
      bankBranch: def.bankBranch ?? null,
      bankRoutingNumber: def.bankRoutingNumber ?? null,
    };
  }

  private async insertCustomer(
    ctx: DemoSeedContext,
    tx: Prisma.TransactionClient,
    def: DemoCustomerDef,
    assignedToId: string | null,
  ) {
    const pii = this.buildCustomerPii(def, ctx.companyId);
    const core = this.buildCustomerCore(def);
    const familyAndBank = this.buildCustomerFamilyAndBank(def);

    return tx.customer.create({
      data: {
        companyId: ctx.companyId,
        ...core,
        ...familyAndBank,
        ...pii,
        branchId: ctx.branchId,
        assignedToId,
        isKycCompleted: false,
      },
    });
  }

  private async seedCustomerRelations(
    companyId: string,
    customerId: string,
    def: DemoCustomerDef,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.seedContacts(companyId, customerId, def, tx);
    await this.seedAddresses(companyId, customerId, def, tx);
    await this.seedNominees(companyId, customerId, def.nominees, tx);
    await this.seedCoBuyers(companyId, customerId, def.coBuyers, tx);
  }

  private async seedContacts(
    companyId: string,
    customerId: string,
    def: DemoCustomerDef,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (!def.contacts || def.contacts.length === 0) return;
    await tx.customerContact.createMany({
      data: def.contacts.map((c) => ({
        companyId,
        customerId,
        name: c.name,
        relationship: c.relationship ?? null,
        phone: c.phone,
        email: c.email ?? null,
        isPrimary: c.isPrimary ?? false,
      })),
    });
  }

  private async seedAddresses(
    companyId: string,
    customerId: string,
    def: DemoCustomerDef,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (!def.addresses || def.addresses.length === 0) return;
    await tx.customerAddress.createMany({
      data: def.addresses.map((a) => ({
        companyId,
        customerId,
        type: a.type,
        addressLine1: a.addressLine1,
        addressLine2: a.addressLine2 ?? null,
        city: a.city,
        division: a.division ?? null,
        postalCode: a.postalCode ?? null,
        country: a.country ?? 'Bangladesh',
        isPrimary: a.isPrimary ?? false,
      })),
    });
  }

  private async seedNominees(
    companyId: string,
    customerId: string,
    nominees: DemoCustomerNomineeDef[] | undefined,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (!nominees || nominees.length === 0) return;
    for (const n of nominees) {
      await tx.customerNominee.create({
        data: {
          companyId,
          customerId,
          name: n.name,
          relationship: n.relationship,
          phone: n.phone ?? null,
          nidEncrypted: this.fieldCrypto.encrypt(n.nid),
          nidBidx: this.fieldCrypto.blindIndex(n.nid, companyId),
          sharePercentage: n.sharePercentage ?? 100,
          isPowerOfAttorney: n.isPowerOfAttorney ?? false,
          poaDocumentNumber: n.poaDocumentNumber ?? null,
        },
      });
    }
  }

  private async seedCoBuyers(
    companyId: string,
    customerId: string,
    coBuyers: DemoCustomerCoBuyerDef[] | undefined,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (!coBuyers || coBuyers.length === 0) return;
    for (const cb of coBuyers) {
      await tx.customerCoBuyer.create({
        data: {
          companyId,
          primaryCustomerId: customerId,
          name: cb.name,
          relationship: cb.relationship ?? null,
          phone: cb.phone,
          nidEncrypted: this.fieldCrypto.encrypt(cb.nid),
          nidBidx: this.fieldCrypto.blindIndex(cb.nid, companyId),
          sharePercentage: cb.sharePercentage ?? 50,
        },
      });
    }
  }
}
