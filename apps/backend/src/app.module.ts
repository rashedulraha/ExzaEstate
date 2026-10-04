import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { RequestLoggingMiddleware } from './common/logging/request-logging.middleware.js';
import { ClientVersionMiddleware } from './common/middleware/client-version.middleware.js';
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
import { MigrationModule } from './modules/migration/migration.module.js';
import { ExpenseModule } from './modules/expense/expense.module.js';
import { ProcurementModule } from './modules/procurement/procurement.module.js';
import { CommissionModule } from './modules/commission/commission.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { SearchModule } from './modules/search/search.module.js';
import { LocalDataModule } from './modules/local-data/local-data.module.js';

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
    MigrationModule,
    ExpenseModule,
    ProcurementModule,
    CommissionModule,
    RealtimeModule,
    DashboardModule,
    SearchModule,
    LocalDataModule,
  ],
})

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware, ClientVersionMiddleware).forRoutes('*');
  }
}
