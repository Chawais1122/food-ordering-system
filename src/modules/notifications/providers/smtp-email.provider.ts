import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import { TypedConfigService } from '../../../config/typed-config';
import { EmailMessage, EmailProvider } from './notification-providers';

const CONNECTION_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 20_000;

@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(@Inject(ConfigService) config: TypedConfigService) {
    const { host, port, secure, user, password, from } = config.get('notifications', { infer: true }).smtp;
    this.transporter = createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass: password } : undefined,
      connectionTimeout: CONNECTION_TIMEOUT_MS,
      greetingTimeout: CONNECTION_TIMEOUT_MS,
      socketTimeout: SOCKET_TIMEOUT_MS,
    });
    this.from = from as string;
  }

  async send({ to, subject, body }: EmailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.from, to, subject, text: body });
  }
}
