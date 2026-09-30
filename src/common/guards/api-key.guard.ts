import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
//import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { TypedConfigService } from '../../config/typed-config';
// import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { safeEqualHex, sha256 } from '../utils/crypto.util';

export const API_KEY_HEADER = 'x-api-key';
export const API_KEY_SECURITY = 'api-key';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly apiKeyHash: string;

  constructor(
    // private readonly reflector: Reflector,
    @Inject(ConfigService) config: TypedConfigService,
  ) {
    this.apiKeyHash = sha256(config.get('auth', { infer: true }).apiKey);
  }

  canActivate(context: ExecutionContext): boolean {
    // const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
    //   context.getHandler(),
    //   context.getClass(),
    // ]);
    // if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers[API_KEY_HEADER];
    if (typeof apiKey !== 'string' || !apiKey) throw new UnauthorizedException('Missing API key');

    if (!safeEqualHex(sha256(apiKey), this.apiKeyHash)) {
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }
}
