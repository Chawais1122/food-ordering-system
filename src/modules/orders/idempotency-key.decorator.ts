import { BadRequestException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
const VALID_KEY = /^[A-Za-z0-9_-]{8,64}$/;

export const IdempotencyKey = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const key = ctx.switchToHttp().getRequest<Request>().header(IDEMPOTENCY_KEY_HEADER);
  if (!key || !VALID_KEY.test(key)) {
    throw new BadRequestException(
      'Idempotency-Key header is required (8-64 chars: letters, digits, "-" or "_")',
    );
  }
  return key;
});
