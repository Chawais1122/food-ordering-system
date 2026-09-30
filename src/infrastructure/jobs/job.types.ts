import { NotificationRequest } from '../../modules/notifications/notification.types';
import { OrderCreatedEvent, OrderPaidEvent } from '../../modules/orders/order-events';

export type JobPayload = Record<string, unknown>;

export enum JobType {
  ORDER_CREATED = 'order.created',
  ORDER_PAID = 'order.paid',
  SEND_NOTIFICATION = 'notification.send',
}

export enum JobStatus {
  PENDING = 'PENDING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export interface JobPayloads {
  [JobType.ORDER_CREATED]: OrderCreatedEvent;
  [JobType.ORDER_PAID]: OrderPaidEvent;
  [JobType.SEND_NOTIFICATION]: NotificationRequest;
}
