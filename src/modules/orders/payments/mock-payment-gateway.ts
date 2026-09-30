import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { ChargeRequest, ChargeResult, PaymentGateway } from './payment-gateway';

@Injectable()
export class MockPaymentGateway extends PaymentGateway {
  private readonly logger = new Logger(MockPaymentGateway.name);

  async charge({ orderId, amountMinor, currency, idempotencyKey }: ChargeRequest): Promise<ChargeResult> {
    const reference = `mock_${createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 24)}`;
    this.logger.log(`Approved sandbox charge ${reference} for order ${orderId}: ${amountMinor} ${currency}`);
    return { approved: true, reference };
  }
}
