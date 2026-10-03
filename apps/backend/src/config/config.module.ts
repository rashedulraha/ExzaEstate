import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from './config.service.js';
import { type EnvConfig } from './env.schema.js';

@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {
  static forRoot(customConfig?: EnvConfig): DynamicModule {
    return {
      module: ConfigModule,
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService(customConfig),
        },
      ],
      exports: [ConfigService],
    };
  }
}
