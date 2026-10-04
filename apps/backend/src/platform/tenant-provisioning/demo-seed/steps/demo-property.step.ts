import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DemoSeedContext, DemoSeedStep } from '../demo-seed-step.interface.js';
import { DemoBlockDef, buildPurbachalBlocks, buildRiverviewBlocks } from './demo-property.data.js';

@Injectable()
export class DemoPropertyStep implements DemoSeedStep {
  private readonly logger = new Logger(DemoPropertyStep.name);
  readonly name = 'DemoPropertyStep';
  readonly order = 40;

  async execute(ctx: DemoSeedContext, tx: Prisma.TransactionClient): Promise<void> {
    const projects = await tx.project.findMany({
      where: { companyId: ctx.companyId, deletedAt: null },
      select: { id: true, code: true },
    });

    const purbachalProject = projects.find((p) => p.code === 'PRJ-PUR-001');
    const riverviewProject = projects.find((p) => p.code === 'PRJ-BRV-002');

    if (!purbachalProject || !riverviewProject) {
      this.logger.warn(
        `Required demo projects not found for company ${ctx.companyId}. Skipping demo property seed.`,
      );
      return;
    }

    // 1. Seed Purbachal Green City (30 Plots across Blocks A, B, C)
    await this.seedHierarchy(ctx.companyId, purbachalProject.id, buildPurbachalBlocks(), tx);

    // 2. Seed Bashundhara Riverview Heights (Twin Tower: Flats, Shops, Parking)
    await this.seedHierarchy(ctx.companyId, riverviewProject.id, buildRiverviewBlocks(), tx);

    this.logger.log(`Demo property seed completed with 50+ units for company ${ctx.companyId}`);
  }

  private async seedHierarchy(
    companyId: string,
    projectId: string,
    blocks: DemoBlockDef[],
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    for (const b of blocks) {
      let block = await tx.propertyBlock.findFirst({
        where: { companyId, projectId, code: b.code, deletedAt: null },
      });

      if (!block) {
        block = await tx.propertyBlock.create({
          data: {
            companyId,
            projectId,
            code: b.code,
            name: b.name,
            type: b.type,
            description: b.description,
          },
        });
      }

      for (const f of b.floors) {
        let floor = await tx.propertyFloor.findFirst({
          where: { companyId, blockId: block.id, code: f.code, deletedAt: null },
        });

        if (!floor) {
          floor = await tx.propertyFloor.create({
            data: {
              companyId,
              projectId,
              blockId: block.id,
              code: f.code,
              name: f.name,
              floorNumber: f.floorNumber,
              type: f.type,
              description: f.description,
            },
          });
        }

        for (const u of f.units) {
          const existingProp = await tx.property.findFirst({
            where: { companyId, projectId, code: u.code, deletedAt: null },
          });

          if (!existingProp) {
            await tx.property.create({
              data: {
                companyId,
                projectId,
                blockId: block.id,
                floorId: floor.id,
                code: u.code,
                title: u.title,
                type: u.type,
                status: u.status,
                areaSqft: u.areaSqft,
                facing: u.facing,
                basePricePaisa: u.basePricePaisa,
                premiumPaisa: u.premiumPaisa,
                discountLimitPct: u.discountLimitPct,
                netPricePaisa: u.basePricePaisa + u.premiumPaisa,
                ownerType: u.ownerType || 'COMPANY',
                holdExpiresAt: u.holdExpiresAt,
                blockReason: u.blockReason,
                description: u.description,
              },
            });
          }
        }
      }
    }
  }
}
