import { NotificationTemplate, RenderedNotification } from './notification.types';

type TemplateData = Record<string, string | number>;

const formatMinor = (amountMinor: string | number, currency: string | number): string =>
  `${(Number(amountMinor) / 100).toFixed(2)} ${currency}`;

const TEMPLATES: Record<NotificationTemplate, (data: TemplateData) => RenderedNotification> = {
  [NotificationTemplate.OTP_CODE]: (data) => ({
    subject: 'Your login code',
    body: `Your login code is ${data.code}. It expires in ${Math.round(Number(data.expiresInSeconds) / 60)} minutes. Never share it with anyone.`,
  }),
  [NotificationTemplate.ORDER_CONFIRMATION]: (data) => ({
    subject: `Order ${data.orderId} received`,
    body: `Hi ${data.name}, we received your order ${data.orderId} for ${formatMinor(data.totalMinor, data.currency)} (${data.paymentType}).`,
  }),
  [NotificationTemplate.PAYMENT_RECEIPT]: (data) => ({
    subject: `Payment received for order ${data.orderId}`,
    body: `Hi ${data.name}, payment of ${formatMinor(data.totalMinor, data.currency)} for order ${data.orderId} was successful.`,
  }),
};

export const renderNotification = (
  template: NotificationTemplate,
  data: TemplateData,
): RenderedNotification => TEMPLATES[template](data);
