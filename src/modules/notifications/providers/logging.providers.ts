import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypedConfigService } from '../../../config/typed-config';
import { EmailMessage, EmailProvider, SmsMessage, SmsProvider } from './notification-providers';

abstract class LoggingProvider {
  protected readonly logger = new Logger(this.constructor.name);
  private readonly revealBodies: boolean;

  constructor(config: TypedConfigService) {
    this.revealBodies = config.get('nodeEnv', { infer: true }) !== 'production';
  }

  protected describe(body: string): string {
    return this.revealBodies ? body : '[redacted]';
  }
}

@Injectable()
export class LoggingEmailProvider extends LoggingProvider implements EmailProvider {
  constructor(@Inject(ConfigService) config: TypedConfigService) {
    super(config);
  }

  async send({ to, subject, body }: EmailMessage): Promise<void> {
    this.logger.log(`EMAIL -> ${to} | ${subject} | ${this.describe(body)}`);
  }
}

@Injectable()
export class LoggingSmsProvider extends LoggingProvider implements SmsProvider {
  constructor(@Inject(ConfigService) config: TypedConfigService) {
    super(config);
  }

  async send({ to, body }: SmsMessage): Promise<void> {
    this.logger.log(`SMS -> ${to} | ${this.describe(body)}`);
  }
}
