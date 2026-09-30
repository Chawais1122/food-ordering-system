import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AUTH_THROTTLER_NAME, isAuthThrottled } from './common/decorators/auth-throttle.decorator';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AppConfigModule } from './config/config.module';
import { TypedConfigService } from './config/typed-config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { JobsModule } from './infrastructure/jobs/jobs.module';
import { JobRunnerModule } from './jobs/job-runner.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { HealthModule } from './modules/health/health.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    JobsModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: TypedConfigService) => {
        const { ttlMs, limit, authLimit } = config.get('throttle', { infer: true });
        return {
          throttlers: [
            { name: 'default', ttl: ttlMs, limit },
            {
              name: AUTH_THROTTLER_NAME,
              ttl: ttlMs,
              limit: authLimit,
              skipIf: (ctx) => !isAuthThrottled(ctx),
            },
          ],
        };
      },
    }),
    UsersModule,
    AuthModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    HealthModule,
    JobRunnerModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }
}
