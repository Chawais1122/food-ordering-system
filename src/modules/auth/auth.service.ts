import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { IdentifierType, ParsedIdentifier, parseIdentifier } from '../../common/utils/identifier.util';
import { TypedConfigService } from '../../config/typed-config';
import { NotificationChannel, NotificationTemplate } from '../notifications/notification.types';
import { NotificationsService } from '../notifications/notifications.service';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { OtpRequestedResponseDto, RequestOtpDto, VerifyOtpDto } from './dto/otp.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto, TokenPairDto } from './dto/token.dto';
import { OtpService, OtpVerificationResult } from './otp/otp.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

const INVALID_CREDENTIALS = 'Invalid credentials';
const OTP_REQUESTED_MESSAGE = 'If the account exists, a login code has been sent';

@Injectable()
export class AuthService {
  private readonly otpTtlSeconds: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
    @Inject(ConfigService) config: TypedConfigService,
  ) {
    this.otpTtlSeconds = config.get('otp', { infer: true }).ttlSeconds;
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      passwordHash: await this.passwordService.hash(dto.password),
    });
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const identifier = parseIdentifier(dto.identifier);
    const user = identifier ? await this.usersService.findByIdentifierWithPassword(identifier) : null;
    const passwordValid = user
      ? await this.passwordService.compare(dto.password, user.passwordHash)
      : await this.passwordService.compareAgainstDummy(dto.password);

    if (!user || !passwordValid) throw new UnauthorizedException(INVALID_CREDENTIALS);
    return this.buildAuthResponse(user);
  }

  async requestOtp(dto: RequestOtpDto): Promise<OtpRequestedResponseDto> {
    const identifier = this.parseOrThrow(dto.identifier);
    const response = { message: OTP_REQUESTED_MESSAGE, expiresInSeconds: this.otpTtlSeconds };

    const user = await this.usersService.findByIdentifier(identifier);
    if (!user) return response;

    await this.dataSource.transaction(async (manager) => {
      const { code, expiresInSeconds } = await this.otpService.issue(manager, identifier);
      await this.notificationsService.enqueue(
        manager,
        {
          channel:
            identifier.type === IdentifierType.EMAIL ? NotificationChannel.EMAIL : NotificationChannel.SMS,
          recipient: identifier.value,
          template: NotificationTemplate.OTP_CODE,
          data: { code, expiresInSeconds },
        },
        { expiresInMs: expiresInSeconds * 1000 },
      );
    });
    return response;
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResponseDto> {
    const identifier = this.parseOrThrow(dto.identifier);
    const result = await this.otpService.verify(identifier, dto.code);

    switch (result) {
      case OtpVerificationResult.VALID:
        break;
      case OtpVerificationResult.EXPIRED:
        throw new UnauthorizedException('Code is invalid or has expired');
      case OtpVerificationResult.TOO_MANY_ATTEMPTS:
        throw new HttpException(
          'Too many invalid attempts, please request a new code',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      default:
        throw new UnauthorizedException('Code is invalid or has expired');
    }

    const user = await this.usersService.findByIdentifier(identifier);
    if (!user) throw new UnauthorizedException(INVALID_CREDENTIALS);
    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string): Promise<TokenPairDto> {
    return (await this.tokenService.rotate(refreshToken)).tokens;
  }

  logout(refreshToken: string): Promise<void> {
    return this.tokenService.revoke(refreshToken);
  }

  private async buildAuthResponse(user: User): Promise<AuthResponseDto> {
    return { user: UserResponseDto.from(user), tokens: await this.tokenService.issue(user) };
  }

  private parseOrThrow(raw: string): ParsedIdentifier {
    const identifier = parseIdentifier(raw);
    if (!identifier) {
      throw new BadRequestException('identifier must be a valid email or E.164 phone number');
    }
    return identifier;
  }
}
