export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export enum NotificationTemplate {
  OTP_CODE = 'OTP_CODE',
  ORDER_CONFIRMATION = 'ORDER_CONFIRMATION',
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',
}

export interface NotificationRequest {
  channel: NotificationChannel;
  recipient: string;
  template: NotificationTemplate;
  data: Record<string, string | number>;
}

export interface RenderedNotification {
  subject: string;
  body: string;
}
