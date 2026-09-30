export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

export interface SmsMessage {
  to: string;
  body: string;
}

export abstract class EmailProvider {
  abstract send(message: EmailMessage): Promise<void>;
}

export abstract class SmsProvider {
  abstract send(message: SmsMessage): Promise<void>;
}
