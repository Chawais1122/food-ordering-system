import { ExecutionContext, SetMetadata } from '@nestjs/common';

export const AUTH_THROTTLE_KEY = 'authThrottle';
export const AUTH_THROTTLER_NAME = 'auth';

export const AuthThrottle = (): MethodDecorator & ClassDecorator => SetMetadata(AUTH_THROTTLE_KEY, true);

export const isAuthThrottled = (context: ExecutionContext): boolean =>
  Boolean(
    Reflect.getMetadata(AUTH_THROTTLE_KEY, context.getHandler()) ??
    Reflect.getMetadata(AUTH_THROTTLE_KEY, context.getClass()),
  );
