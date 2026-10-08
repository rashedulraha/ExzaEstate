import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { ConfigService } from '../config/config.service.js';

@Injectable()
export class SystemPrisma implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SystemPrisma.name);
  private readonly pool: pg.Pool;
  private readonly client: PrismaClient;

  constructor(configService: ConfigService) {
    const rawUrl =
      configService.systemDatabaseUrl ||
      process.env.SYSTEM_DATABASE_URL ||
      (!configService.isProduction
        ? 'postgresql://exza_system:exza_system_secret@localhost:5432/exzaestate?schema=public'
        : undefined);

    if (!rawUrl) {
      throw new Error(
        'SYSTEM_DATABASE_URL is not configured. In production, SYSTEM_DATABASE_URL must be provided via environment variables.',
      );
    }

    const pool = new pg.Pool({ connectionString: rawUrl });
    const adapter = new PrismaPg(pool);

    this.client = new PrismaClient({
      adapter,
      log: [{ emit: 'stdout', level: 'error' }],
    });
    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.$connect();
      this.logger.log('Connected to PostgreSQL system realm via exza_system role');
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL system realm', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
    if (!this.pool.ended) {
      await this.pool.end();
    }
    this.logger.log('Disconnected from PostgreSQL system realm');
  }

  /**
   * Executes a cross-tenant, platform-level operation.
   * Requires a mandatory '// SYSTEM-SCOPE: <reason>' marker for audit compliance.
   */
  async executeWithReason<T>(
    reason: string,
    operation: (client: PrismaClient) => Promise<T>,
  ): Promise<T> {
    if (!reason || typeof reason !== 'string') {
      throw new Error('A system-scope audit reason must be provided');
    }

    if (!reason.trim().startsWith('// SYSTEM-SCOPE:')) {
      throw new Error(
        `System-scoped operation rejected. Mandatory marker missing: reason must start with '// SYSTEM-SCOPE: <reason>' (got: "${reason}")`,
      );
    }

    this.logger.warn(`[AUDIT-SYSTEM-SCOPE] ${reason.trim()}`);
    return operation(this.client);
  }
}
