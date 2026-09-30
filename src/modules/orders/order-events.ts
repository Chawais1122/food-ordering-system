import { PaymentType } from './order.enums';

export interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  totalAmountMinor: number;
  currency: string;
  paymentType: PaymentType;
  itemCount: number;
}

export interface OrderPaidEvent {
  orderId: string;
  userId: string;
  totalAmountMinor: number;
  currency: string;
  paymentReference: string;
}
