import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { RequestLoggingMiddleware } from './common/logging/request-logging.middleware.js';
import { ConfigModule } from './config/config.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CompanyModule } from './modules/company/company.module.js';
import { EmployeeModule } from './modules/employee/employee.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    HealthModule,
    AuthModule,
    CompanyModule,
    EmployeeModule,
    SettingsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
