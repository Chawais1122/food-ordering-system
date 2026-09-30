import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { AccessTokenPayload } from '../../common/types/authenticated-user';
import { randomToken, safeEqualHex, sha256 } from '../../common/utils/crypto.util';
import { AppConfig } from '../../config/configuration';
import { TypedConfigService } from '../../config/typed-config';
import { User } from '../users/user.entity';
import { TokenPairDto } from './dto/token.dto';
import { RefreshToken } from './entities/refresh-token.entity';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly settings: AppConfig['auth'];

  constructor(
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    @InjectRepository(RefreshToken) private readonly refreshTokens: Repository<RefreshToken>,
    @Inject(ConfigService) config: TypedConfigService,
  ) {
    this.settings = config.get('auth', { infer: true });
  }

  issue(user: Pick<User, 'id' | 'role'>): Promise<TokenPairDto> {
    return this.issueWith(this.dataSource.manager, user);
  }

  async rotate(presentedToken: string): Promise<{ userId: string; tokens: TokenPairDto }> {
    const { id, secret } = this.parse(presentedToken);

    const outcome = await this.dataSource.transaction(async (manager) => {
      const stored = await manager.findOne(RefreshToken, {
        where: { id },
        relations: { user: true },
        lock: { mode: 'pessimistic_write', tables: ['refresh_tokens'] },
      });

      if (!stored || !safeEqualHex(stored.tokenHash, sha256(secret))) {
        return { error: 'Invalid refresh token' } as const;
      }
      if (stored.revokedAt) {
        await this.revokeAllForUser(manager, stored.userId);
        this.logger.warn(`Refresh token reuse detected for user ${stored.userId}; all sessions revoked`);
        return { error: 'Refresh token has been revoked' } as const;
      }
      if (stored.expiresAt.getTime() <= Date.now()) {
        return { error: 'Refresh token has expired' } as const;
      }

      const tokens = await this.issueWith(manager, stored.user);
      const [newId] = tokens.refreshToken.split('.');
      await manager.update(RefreshToken, stored.id, { revokedAt: new Date(), replacedById: newId });
      return { userId: stored.userId, tokens } as const;
    });

    if ('error' in outcome) throw new UnauthorizedException(outcome.error);
    return outcome;
  }

  async revoke(presentedToken: string): Promise<void> {
    const parsed = this.tryParse(presentedToken);
    if (!parsed) return;
    await this.refreshTokens.update(
      { id: parsed.id, tokenHash: sha256(parsed.secret), revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private async issueWith(manager: EntityManager, user: Pick<User, 'id' | 'role'>): Promise<TokenPairDto> {
    const payload: AccessTokenPayload = { sub: user.id, role: user.role };
    const secret = randomToken(32);
    const [accessToken, record] = await Promise.all([
      this.jwtService.signAsync(payload),
      manager.save(
        manager.create(RefreshToken, {
          userId: user.id,
          tokenHash: sha256(secret),
          expiresAt: new Date(Date.now() + this.settings.refreshTtlDays * DAY_MS),
        }),
      ),
    ]);

    return {
      accessToken,
      refreshToken: `${record.id}.${secret}`,
      tokenType: 'Bearer',
      expiresIn: this.settings.accessTtlSeconds,
    };
  }

  private async revokeAllForUser(manager: EntityManager, userId: string): Promise<void> {
    await manager.update(RefreshToken, { userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  private parse(token: string): { id: string; secret: string } {
    const parsed = this.tryParse(token);
    if (!parsed) throw new UnauthorizedException('Invalid refresh token');
    return parsed;
  }

  private tryParse(token: string): { id: string; secret: string } | undefined {
    const [id, secret, ...rest] = token.split('.');
    if (rest.length || !secret || !UUID_REGEX.test(id)) return undefined;
    return { id, secret };
  }
}
