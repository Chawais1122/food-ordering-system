import { Injectable, Logger } from '@nestjs/common';
import { JobPayload, JobPayloads, JobType } from '../infrastructure/jobs/job.types';
import { NotificationDispatcher } from '../modules/notifications/notification-dispatcher.service';
import { NotificationChannel, NotificationTemplate } from '../modules/notifications/notification.types';
import { UsersService } from '../modules/users/users.service';

@Injectable()
export class JobHandlers {
  private readonly logger = new Logger(JobHandlers.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  async handle(type: JobType, payload: JobPayload): Promise<void> {
    switch (type) {
      case JobType.SEND_NOTIFICATION:
        return this.dispatcher.dispatch(payload as unknown as JobPayloads[JobType.SEND_NOTIFICATION]);
      case JobType.ORDER_CREATED: {
        const event = payload as unknown as JobPayloads[JobType.ORDER_CREATED];
        return this.emailCustomer(event.userId, event.orderId, NotificationTemplate.ORDER_CONFIRMATION, {
          totalMinor: event.totalAmountMinor,
          currency: event.currency,
          paymentType: event.paymentType,
        });
      }
      case JobType.ORDER_PAID: {
        const event = payload as unknown as JobPayloads[JobType.ORDER_PAID];
        return this.emailCustomer(event.userId, event.orderId, NotificationTemplate.PAYMENT_RECEIPT, {
          totalMinor: event.totalAmountMinor,
          currency: event.currency,
          paymentReference: event.paymentReference,
        });
      }
      default:
        throw new Error(`No handler for job type "${String(type)}"`);
    }
  }

  private async emailCustomer(
    userId: string,
    orderId: string,
    template: NotificationTemplate,
    data: Record<string, string | number>,
  ): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      this.logger.warn(`User ${userId} for order ${orderId} no longer exists; skipping ${template}`);
      return;
    }
    await this.dispatcher.dispatch({
      channel: NotificationChannel.EMAIL,
      recipient: user.email,
      template,
      data: { name: user.name, orderId, ...data },
    });
  }
}
