import { Injectable } from '@nestjs/common';
import { type EnvConfig, validateEnv } from './env.schema.js';

@Injectable()
export class ConfigService {
  private readonly config: EnvConfig;

  constructor(customConfig?: EnvConfig) {
    this.config = customConfig ?? validateEnv();
  }

  get<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
    return this.config[key];
  }

  get nodeEnv(): EnvConfig['NODE_ENV'] {
    return this.config.NODE_ENV;
  }

  get isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  get isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  get isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  get port(): number {
    return this.config.PORT;
  }

  get runtimeMode(): EnvConfig['RUNTIME_MODE'] {
    return this.config.RUNTIME_MODE;
  }

  get databaseUrl(): string {
    return this.config.DATABASE_URL;
  }

  get migratorDatabaseUrl(): string | undefined {
    return this.config.MIGRATOR_DATABASE_URL;
  }

  get redisUrl(): string {
    return this.config.REDIS_URL;
  }

  get jwt(): {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  } {
    return {
      accessSecret: this.config.JWT_ACCESS_SECRET,
      refreshSecret: this.config.JWT_REFRESH_SECRET,
      accessExpiresIn: this.config.JWT_ACCESS_EXPIRES_IN,
      refreshExpiresIn: this.config.JWT_REFRESH_EXPIRES_IN,
    };
  }

  get storage(): {
    endpoint: string;
    region: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
    forcePathStyle: boolean;
  } {
    return {
      endpoint: this.config.STORAGE_ENDPOINT,
      region: this.config.STORAGE_REGION,
      bucket: this.config.STORAGE_BUCKET,
      accessKey: this.config.STORAGE_ACCESS_KEY,
      secretKey: this.config.STORAGE_SECRET_KEY,
      forcePathStyle: this.config.STORAGE_FORCE_PATH_STYLE,
    };
  }

  get corsOrigins(): string[] {
    return this.config.CORS_ORIGIN.split(',').map((origin) => origin.trim());
  }

  get logLevel(): EnvConfig['LOG_LEVEL'] {
    return this.config.LOG_LEVEL;
  }

  get swagger(): {
    enabled: boolean;
    user?: string;
    password?: string;
  } {
    return {
      enabled: this.config.SWAGGER_ENABLED,
      user: this.config.SWAGGER_USER,
      password: this.config.SWAGGER_PASSWORD,
    };
  }

  get minSupportedClientVersion(): string {
    return this.config.MIN_SUPPORTED_CLIENT_VERSION;
  }

  get localApiSecret(): string | undefined {
    return this.config.LOCAL_API_SECRET;
  }
}
