import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { RequestLoggingMiddleware } from './common/logging/request-logging.middleware.js';
import { ConfigModule } from './config/config.module.js';
import { ApprovalsModule } from './modules/approvals/approvals.module.js';
import { AccountingModule } from './modules/accounting/accounting.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CollectionModule } from './modules/collection/collection.module.js';
import { CompanyModule } from './modules/company/company.module.js';
import { CrmModule } from './modules/crm/crm.module.js';
import { EmployeeModule } from './modules/employee/employee.module.js';
import { DocumentsModule } from './modules/documents/documents.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { LandModule } from './modules/land/land.module.js';
import { ProjectModule } from './modules/project/project.module.js';
import { PropertyModule } from './modules/property/property.module.js';
import { SalesModule } from './modules/sales/sales.module.js';
import { LicenseModule } from './modules/license/license.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { SystemAdminModule } from './modules/system-admin/system-admin.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    HealthModule,
    AuditModule,
    ApprovalsModule,
    AccountingModule,
    AuthModule,
    CollectionModule,
    CompanyModule,
    CrmModule,
    DocumentsModule,
    EmployeeModule,
    LandModule,
    LicenseModule,
    NotificationsModule,
    ProjectModule,
    PropertyModule,
    ReportsModule,
    SalesModule,
    SettingsModule,
    SystemAdminModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
