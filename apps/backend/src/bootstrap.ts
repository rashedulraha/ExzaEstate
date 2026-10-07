import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor.js';
import { requestIdMiddleware } from './common/logging/request-logging.middleware.js';
import { ConfigService } from './config/config.service.js';
import { setupSwagger } from './config/swagger.config.js';

export function configureApp(app: INestApplication, configService: ConfigService): void {
  // Cookie parser for reading HttpOnly refresh token cookies
  app.use(cookieParser());

  // Request ID and logging middleware
  app.use(requestIdMiddleware);

  // Enable CORS for frontend and desktop clients
  app.enableCors({
    origin: configService.corsOrigins.length > 0 ? configService.corsOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Client',
      'X-Client-Version',
      'X-Request-Id',
      'Idempotency-Key',
      'X-Local-Secret',
      'Accept',
    ],
  });

  // Security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: configService.isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Global REST API prefix: /api/v1
  app.setGlobalPrefix('api/v1', {
    exclude: ['api/docs', 'api/docs/(.*)'],
  });

  // Redirect root '/' to '/api/v1' for developer convenience
  const httpAdapter = app.getHttpAdapter();
  if (httpAdapter && typeof httpAdapter.get === 'function') {
    httpAdapter.get('/', (_req: unknown, res: { redirect: (url: string) => void }) => {
      res.redirect('/api/v1');
    });
  }

  // Global response envelope: { success: true, data, meta }
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());

  // Global exception filter mapping error codes to envelope: { success: false, error: { code, message, details } }
  app.useGlobalFilters(new HttpExceptionFilter(configService));

  // Global validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // OpenAPI Swagger configuration with production gating
  setupSwagger(app, configService);
}
