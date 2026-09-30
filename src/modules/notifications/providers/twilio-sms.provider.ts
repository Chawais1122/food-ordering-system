import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { TypedConfigService } from '../../../config/typed-config';
import { SmsMessage, SmsProvider } from './notification-providers';

@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  private readonly client: Twilio;
  private readonly fromNumber: string;

  constructor(@Inject(ConfigService) config: TypedConfigService) {
    const { accountSid, authToken, fromNumber } = config.get('notifications', { infer: true }).twilio;
    this.client = new Twilio(accountSid, authToken);
    this.fromNumber = fromNumber as string;
  }

  async send({ to, body }: SmsMessage): Promise<void> {
    await this.client.messages.create({ from: this.fromNumber, to, body });
  }
}
