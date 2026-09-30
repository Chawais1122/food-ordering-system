import { Injectable } from '@nestjs/common';
import { renderNotification } from './notification-templates';
import { NotificationChannel, NotificationRequest } from './notification.types';
import { EmailProvider, SmsProvider } from './providers/notification-providers';

@Injectable()
export class NotificationDispatcher {
  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
  ) {}

  async dispatch({ channel, recipient, template, data }: NotificationRequest): Promise<void> {
    const { subject, body } = renderNotification(template, data);
    if (channel === NotificationChannel.EMAIL) {
      await this.emailProvider.send({ to: recipient, subject, body });
      return;
    }
    await this.smsProvider.send({ to: recipient, body });
  }
}
