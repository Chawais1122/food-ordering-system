export interface ChargeRequest {
  orderId: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
}

export interface ChargeResult {
  approved: boolean;
  reference: string;
  declineReason?: string;
}

export abstract class PaymentGateway {
  abstract charge(request: ChargeRequest): Promise<ChargeResult>;
}
