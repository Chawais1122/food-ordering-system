import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager } from 'typeorm';
import { hmacSha256, randomNumericCode, safeEqualHex } from '../../../common/utils/crypto.util';
import { ParsedIdentifier } from '../../../common/utils/identifier.util';
import { AppConfig } from '../../../config/configuration';
import { TypedConfigService } from '../../../config/typed-config';
import { OtpCode } from '../entities/otp-code.entity';

export enum OtpVerificationResult {
  VALID = 'VALID',
  INVALID = 'INVALID',
  EXPIRED = 'EXPIRED',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
}

export interface IssuedOtp {
  code: string;
  expiresInSeconds: number;
}

@Injectable()
export class OtpService {
  private readonly settings: AppConfig['otp'];

  constructor(
    private readonly dataSource: DataSource,
    @Inject(ConfigService) config: TypedConfigService,
  ) {
    this.settings = config.get('otp', { infer: true });
  }

  async issue(manager: EntityManager, identifier: ParsedIdentifier): Promise<IssuedOtp> {
    const { ttlSeconds, length, resendCooldownSeconds } = this.settings;
    const code = randomNumericCode(length);

    const rows: unknown[] = await manager.query(
      `INSERT INTO otp_codes (identifier_type, identifier_value, code_hash, attempts, expires_at, sent_at)
       VALUES ($1, $2, $3, 0, now() + make_interval(secs => $4::int), now())
       ON CONFLICT (identifier_type, identifier_value) DO UPDATE
         SET code_hash = EXCLUDED.code_hash, attempts = 0, expires_at = EXCLUDED.expires_at, sent_at = now()
         WHERE otp_codes.sent_at <= now() - make_interval(secs => $5::int)
       RETURNING id`,
      [identifier.type, identifier.value, this.hash(identifier, code), ttlSeconds, resendCooldownSeconds],
    );
    if (rows.length === 0) {
      throw new HttpException('Please wait before requesting another code', HttpStatus.TOO_MANY_REQUESTS);
    }
    return { code, expiresInSeconds: ttlSeconds };
  }

  verify(identifier: ParsedIdentifier, code: string): Promise<OtpVerificationResult> {
    return this.dataSource.transaction(async (manager) => {
      const otp = await manager.findOne(OtpCode, {
        where: { identifierType: identifier.type, identifierValue: identifier.value },
        lock: { mode: 'pessimistic_write' },
      });

      if (!otp?.codeHash || otp.expiresAt.getTime() <= Date.now()) return OtpVerificationResult.EXPIRED;

      if (safeEqualHex(otp.codeHash, this.hash(identifier, code))) {
        await manager.update(OtpCode, otp.id, { codeHash: null });
        return OtpVerificationResult.VALID;
      }

      const attempts = otp.attempts + 1;
      if (attempts >= this.settings.maxAttempts) {
        await manager.update(OtpCode, otp.id, { codeHash: null, attempts });
        return OtpVerificationResult.TOO_MANY_ATTEMPTS;
      }
      await manager.update(OtpCode, otp.id, { attempts });
      return OtpVerificationResult.INVALID;
    });
  }

  private hash(identifier: ParsedIdentifier, code: string): string {
    return hmacSha256(this.settings.hashSecret, `${identifier.type}:${identifier.value}:${code}`);
  }
}
