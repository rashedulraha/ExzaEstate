import 'reflect-metadata';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(path.resolve(process.cwd(), '.env'));
  } catch {}
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Please define it in your .env file.');
}
process.env.NODE_ENV ||= 'development';
process.env.RUNTIME_MODE = 'local';
process.env.JWT_ACCESS_SECRET ||= 'super_secret_jwt_access_export_key_32c!';
process.env.JWT_REFRESH_SECRET ||= 'super_secret_jwt_refresh_export_key_32!';
process.env.STORAGE_ENDPOINT ||= 'http://localhost:9000';
process.env.STORAGE_BUCKET ||= 'exzaestate';
process.env.STORAGE_ACCESS_KEY ||= 'minioadmin';
process.env.STORAGE_SECRET_KEY ||= 'minioadmin';

async function exportOpenApi(): Promise<void> {
  const { Test } = await import('@nestjs/testing');
  const { DatabaseModule } = await import('./database/database.module.js');
  const { AdaptersModule } = await import('./adapters/adapters.module.js');
  const { AppModule } = await import('./app.module.js');

  const { SessionService } = await import('./modules/auth/session.service.js');

  // Boot DI graph without starting HTTP listener or connecting to external services
  const moduleFixture = await Test.createTestingModule({
    imports: [DatabaseModule, AdaptersModule.forRoot('local'), AppModule],
  })
    .overrideProvider(SessionService)
    .useValue({})
    .compile();

  const app = moduleFixture.createNestApplication();

  // Global REST API prefix: /api/v1 (must match runtime bootstrap)
  app.setGlobalPrefix('api/v1', {
    exclude: ['api/docs', 'api/docs/(.*)'],
  });

  const options = new DocumentBuilder()
    .setTitle('ExzaEstate Enterprise API')
    .setDescription(
      'Multi-tenant real estate management, ERP, and accounting platform REST API contract',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'bearer-jwt',
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);

  // Sanitize document to guarantee 100% OpenAPI 3.0 compliance
  if (document.components?.securitySchemes?.['bearer-jwt']) {
    const scheme = document.components.securitySchemes['bearer-jwt'] as unknown as Record<
      string,
      unknown
    >;
    if (scheme.type === 'http') {
      delete scheme.name;
      delete scheme.in;
    }
  }

  // Recursive schema sanitizer: ensure all array schemas define items
  function sanitizeSchema(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(sanitizeSchema);
      return;
    }
    const record = node as Record<string, unknown>;
    if (record.type === 'array' && !record.items) {
      record.items = { type: 'object' };
    }
    for (const val of Object.values(record)) {
      sanitizeSchema(val);
    }
  }
  sanitizeSchema(document);

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const targetPath =
    process.argv[2] || path.resolve(__dirname, '../../../packages/api-client/openapi.json');

  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Write deterministic formatted JSON
  fs.writeFileSync(targetPath, JSON.stringify(document, null, 2) + '\n', 'utf-8');

  await app.close();
  // eslint-disable-next-line no-console
  console.log(`[OpenAPI Export] Successfully generated ${targetPath}`);
}

exportOpenApi().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[OpenAPI Export Failed]', err);
  process.exit(1);
});
