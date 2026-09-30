import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypedConfigService } from '../../config/typed-config';
import { NotificationDispatcher } from './notification-dispatcher.service';
import { NotificationsService } from './notifications.service';
import { EmailProvider, SmsProvider } from './providers/notification-providers';
import { LoggingEmailProvider, LoggingSmsProvider } from './providers/logging.providers';
import { SmtpEmailProvider } from './providers/smtp-email.provider';
import { TwilioSmsProvider } from './providers/twilio-sms.provider';

const logger = new Logger('NotificationsModule');

@Module({
  providers: [
    NotificationsService,
    NotificationDispatcher,
    {
      provide: EmailProvider,
      inject: [ConfigService],
      useFactory: (config: TypedConfigService): EmailProvider => {
        if (config.get('notifications', { infer: true }).smtp.host) return new SmtpEmailProvider(config);
        logger.warn('SMTP is not configured; emails will be written to the log instead of being sent');
        return new LoggingEmailProvider(config);
      },
    },
    {
      provide: SmsProvider,
      inject: [ConfigService],
      useFactory: (config: TypedConfigService): SmsProvider => {
        if (config.get('notifications', { infer: true }).twilio.accountSid)
          return new TwilioSmsProvider(config);
        logger.warn('Twilio is not configured; SMS will be written to the log instead of being sent');
        return new LoggingSmsProvider(config);
      },
    },
  ],
  exports: [NotificationsService, NotificationDispatcher],
})
export class NotificationsModule {}
