import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { TypedConfigService } from './config/typed-config';

export const API_PREFIX = 'api/v1';

export const configureApp = (app: INestApplication): void => {
  const config = app.get<TypedConfigService>(ConfigService);
  const expressApp = app as NestExpressApplication;
  expressApp.disable('x-powered-by');
  expressApp.set('trust proxy', 1);
  expressApp.useBodyParser('json', { limit: '100kb' });

  app.use(helmet());
  const origins = config.get('corsOrigins', { infer: true });
  app.enableCors({
    origin: origins.length ? origins : false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Idempotency-Key', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Idempotent-Replayed'],
  });

  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.enableShutdownHooks();
};
