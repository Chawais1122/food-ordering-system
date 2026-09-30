import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypedConfigService } from '../../config/typed-config';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { OtpService } from './otp/otp.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Global()
@Module({
  imports: [
    UsersModule,
    NotificationsModule,
    TypeOrmModule.forFeature([RefreshToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: TypedConfigService) => {
        const { accessSecret, accessTtlSeconds } = config.get('auth', { infer: true });
        return {
          secret: accessSecret,
          signOptions: { expiresIn: accessTtlSeconds, algorithm: 'HS256' },
          verifyOptions: { algorithms: ['HS256'] },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TokenService, PasswordService, OtpService],
  exports: [JwtModule],
})
export class AuthModule {}
