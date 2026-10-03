import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';
import { ConfigService } from './config.service.js';

export function setupSwagger(app: INestApplication, configService: ConfigService): void {
  const isProduction = configService.isProduction;
  const swaggerConfig = configService.swagger;

  // Gating rule: Swagger at /api/docs is disabled or auth-gated when NODE_ENV=production
  if (isProduction) {
    const hasAuth =
      swaggerConfig.enabled &&
      swaggerConfig.user &&
      swaggerConfig.user.length > 0 &&
      swaggerConfig.password &&
      swaggerConfig.password.length > 0;

    if (!hasAuth) {
      // In production without auth, Swagger is completely disabled
      return;
    }

    // Auth-gated production access via HTTP Basic Auth
    const user = swaggerConfig.user!;
    const password = swaggerConfig.password!;

    app.use('/api/docs', (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="ExzaEstate API Docs"');
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required for API documentation',
            details: {},
          },
        });
        return;
      }

      const credentials = Buffer.from(authHeader.slice(6), 'base64').toString('utf8');
      const [inputUser, inputPass] = credentials.split(':');

      if (inputUser !== user || inputPass !== password) {
        res.setHeader('WWW-Authenticate', 'Basic realm="ExzaEstate API Docs"');
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid documentation credentials',
            details: {},
          },
        });
        return;
      }

      next();
    });
  }

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
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
