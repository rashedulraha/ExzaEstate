import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { ConfigService } from '../config/config.service.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: pg.Pool;

  constructor(configService: ConfigService) {
    const databaseUrl = configService.databaseUrl;
    const pool = new pg.Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: configService.isDevelopment
        ? [
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
    });

    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Connected to PostgreSQL database via @prisma/adapter-pg');
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL database', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    if (!this.pool.ended) {
      await this.pool.end();
    }
    this.logger.log('Disconnected from PostgreSQL database');
  }

  async queryRawSelect1(): Promise<unknown> {
    return this.$queryRaw`SELECT 1 as result`;
  }
}
