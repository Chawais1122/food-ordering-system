import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { TypedConfigService } from '../../config/typed-config';
import { randomToken } from '../../common/utils/crypto.util';

@Injectable()
export class PasswordService implements OnModuleInit {
  private readonly rounds: number;
  private dummyHash: string;

  constructor(@Inject(ConfigService) config: TypedConfigService) {
    this.rounds = config.get('auth', { infer: true }).bcryptRounds;
  }

  async onModuleInit(): Promise<void> {
    this.dummyHash = await bcrypt.hash(randomToken(), this.rounds);
  }

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async compareAgainstDummy(plain: string): Promise<false> {
    await bcrypt.compare(plain, this.dummyHash);
    return false;
  }
}
