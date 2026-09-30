import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_KEY_HEADER, API_KEY_SECURITY } from './common/guards/api-key.guard';

export const SWAGGER_PATH = 'docs';

export const setupSwagger = (app: INestApplication): void => {
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Food Ordering API')
      .setDescription(
        'Food ordering backend: auth (password + OTP), catalog with variants, cart and idempotent orders.\n\n' +
          'Money values are integers in minor units (e.g. 1299 = 12.99). ' +
          'Protected endpoints require both an `X-API-Key` header and a bearer token. ' +
          'Errors share one shape: `{ statusCode, error, message, path, timestamp, requestId }`.',
      )
      .setVersion('1.0.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .addApiKey({ type: 'apiKey', in: 'header', name: API_KEY_HEADER }, API_KEY_SECURITY)
      .build(),
  );
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    jsonDocumentUrl: `${SWAGGER_PATH}/openapi.json`,
    swaggerOptions: { persistAuthorization: true },
  });
};
