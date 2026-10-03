import type { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';
import { AdaptersModule } from '../../src/adapters/adapters.module.js';
import { configureApp } from '../../src/bootstrap.js';
import { ConfigModule } from '../../src/config/config.module.js';
import { ConfigService } from '../../src/config/config.service.js';
import { validateEnv } from '../../src/config/env.schema.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { TenantDb } from '../../src/database/tenant-db.service.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { TokenService } from '../../src/modules/auth/token.service.js';
import { NotificationOutboxListener } from '../../src/modules/notifications/notification-outbox.listener.js';
import { NotificationService } from '../../src/modules/notifications/notification.service.js';
import { NotificationsModule } from '../../src/modules/notifications/notifications.module.js';
import { OutboxDispatcher } from '../../src/platform/outbox/outbox.dispatcher.js';
import { OutboxService } from '../../src/platform/outbox/outbox.service.js';
import { PlatformModule } from '../../src/platform/platform.module.js';
import { TenantProvisioningModule } from '../../src/platform/tenant-provisioning/tenant-provisioning.module.js';
import { TenantProvisioningService } from '../../src/platform/tenant-provisioning/tenant-provisioning.service.js';

export interface NotificationsTestContext {
  app: INestApplication;
  tenantDb: TenantDb;
  notificationService: NotificationService;
  outboxDispatcher: OutboxDispatcher;
  outboxService: OutboxService;
  outboxListener: NotificationOutboxListener;
  companyAId: string;
  companyBId: string;
  user1AToken: string;
  user1AId: string;
  user2AToken: string;
  user2AId: string;
  userBToken: string;
  userBId: string;
  noPermToken: string;
}

export async function createNotificationsTestContext(): Promise<NotificationsTestContext> {
  const config = validateEnv({
    NODE_ENV: 'test',
    PORT: '3000',
    RUNTIME_MODE: 'cloud',
    DATABASE_URL:
      process.env.DATABASE_URL ||
      'postgresql://exza_app:exza_app_secret@localhost:5432/exzaestate?schema=public',
    MIGRATOR_DATABASE_URL:
      process.env.MIGRATOR_DATABASE_URL ||
      'postgresql://exza_migrator:exza_migrator_secret@localhost:5432/exzaestate?schema=public',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'super_secret_jwt_access_token_key_at_least_32_chars',
    JWT_REFRESH_SECRET: 'super_secret_jwt_refresh_token_key_at_least_32_chars',
    STORAGE_ENDPOINT: process.env.STORAGE_ENDPOINT || 'http://localhost:9000',
    STORAGE_BUCKET: process.env.STORAGE_BUCKET || 'exzaestate-documents',
    STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY || 'minioadmin',
    STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY || 'minioadmin',
    STORAGE_FORCE_PATH_STYLE: 'true',
    CORS_ORIGIN: 'http://localhost:5173,tauri://localhost',
  });

  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot(config),
      ClsModule.forRoot({ global: true, middleware: { mount: true } }),
      DatabaseModule,
      PlatformModule,
      AdaptersModule,
      AuthModule,
      NotificationsModule,
      TenantProvisioningModule,
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  const configService = moduleRef.get<ConfigService>(ConfigService);
  configureApp(app, configService);
  await app.init();

  const tenantDb = moduleRef.get<TenantDb>(TenantDb);
  const tokenService = moduleRef.get<TokenService>(TokenService);
  const provisioningService = moduleRef.get<TenantProvisioningService>(TenantProvisioningService);
  const notificationService = moduleRef.get<NotificationService>(NotificationService);
  const outboxDispatcher = moduleRef.get<OutboxDispatcher>(OutboxDispatcher);
  const outboxService = moduleRef.get<OutboxService>(OutboxService);
  const outboxListener = moduleRef.get<NotificationOutboxListener>(NotificationOutboxListener);

  const suffix = Date.now().toString().slice(-4);

  const compA = await provisioningService.provisionCompany({
    name: 'Notification Test Company A',
    code: `NTC${suffix}A`,
    branchName: 'Head Office A',
    branchCode: 'HO-A',
    managingDirector: {
      email: `mda_notif_${Date.now()}@exzaestate.test`,
      fullName: 'MD Notif User A',
      password: 'Password123!Secure',
      isLocalMode: true,
    },
  });

  const compB = await provisioningService.provisionCompany({
    name: 'Notification Test Company B',
    code: `NTC${suffix}B`,
    branchName: 'Head Office B',
    branchCode: 'HO-B',
    managingDirector: {
      email: `mdb_notif_${Date.now()}@exzaestate.test`,
      fullName: 'MD Notif User B',
      password: 'Password123!Secure',
      isLocalMode: true,
    },
  });

  const user1AId = compA.managingDirectorUserId;
  const userBId = compB.managingDirectorUserId;

  // Enable 2FA on MD users (who hold mandatory 2FA permissions)
  await tenantDb.withCompany(compA.companyId, (tx) =>
    tx.user.update({
      where: { id: user1AId },
      data: { isTwoFactorEnabled: true, twoFactorSecret: 'MOCKSECRET' },
    }),
  );

  await tenantDb.withCompany(compB.companyId, (tx) =>
    tx.user.update({
      where: { id: userBId },
      data: { isTwoFactorEnabled: true, twoFactorSecret: 'MOCKSECRET' },
    }),
  );

  // Create User 2 in Company A
  const user2AId = await tenantDb.withCompany(compA.companyId, async (tx) => {
    const role = await tx.role.findFirstOrThrow({
      where: { companyId: compA.companyId, code: 'EXECUTIVE' },
    });
    const createdUser = await tx.user.create({
      data: {
        companyId: compA.companyId,
        email: `exec_notif_${Date.now()}@exzaestate.test`,
        passwordHash: 'dummy_hash',
        fullName: 'Executive User A',
        status: 'ACTIVE',
        isTwoFactorEnabled: true,
        twoFactorSecret: 'MOCKSECRET',
      },
    });
    await tx.userRole.create({
      data: {
        companyId: compA.companyId,
        userId: createdUser.id,
        roleId: role.id,
      },
    });
    return createdUser.id;
  });

  // Create User with zero permissions in Company A
  const noPermUserId = await tenantDb.withCompany(compA.companyId, async (tx) => {
    const emptyRole = await tx.role.create({
      data: {
        companyId: compA.companyId,
        code: `EMPTY_ROLE_${Date.now()}`,
        name: 'Empty Role',
        isSystem: false,
      },
    });
    const createdUser = await tx.user.create({
      data: {
        companyId: compA.companyId,
        email: `noperm_notif_${Date.now()}@exzaestate.test`,
        passwordHash: 'dummy_hash',
        fullName: 'No Perm User',
        status: 'ACTIVE',
      },
    });
    await tx.userRole.create({
      data: {
        companyId: compA.companyId,
        userId: createdUser.id,
        roleId: emptyRole.id,
      },
    });
    return createdUser.id;
  });

  // Generate tokens
  const user1ATokens = await tenantDb.withCompany(compA.companyId, (tx) =>
    tokenService.createSessionAndTokens(tx, {
      userId: user1AId,
      companyId: compA.companyId,
    }),
  );

  const user2ATokens = await tenantDb.withCompany(compA.companyId, (tx) =>
    tokenService.createSessionAndTokens(tx, {
      userId: user2AId,
      companyId: compA.companyId,
    }),
  );

  const userBTokens = await tenantDb.withCompany(compB.companyId, (tx) =>
    tokenService.createSessionAndTokens(tx, {
      userId: userBId,
      companyId: compB.companyId,
    }),
  );

  const noPermTokens = await tenantDb.withCompany(compA.companyId, (tx) =>
    tokenService.createSessionAndTokens(tx, {
      userId: noPermUserId,
      companyId: compA.companyId,
    }),
  );

  return {
    app,
    tenantDb,
    notificationService,
    outboxDispatcher,
    outboxService,
    outboxListener,
    companyAId: compA.companyId,
    companyBId: compB.companyId,
    user1AToken: user1ATokens.accessToken,
    user1AId,
    user2AToken: user2ATokens.accessToken,
    user2AId,
    userBToken: userBTokens.accessToken,
    userBId,
    noPermToken: noPermTokens.accessToken,
  };
}
