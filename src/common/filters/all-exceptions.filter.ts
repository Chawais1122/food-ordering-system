import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request } from 'express';
import { REQUEST_ID_HEADER } from '../middleware/request-id.middleware';
import {
  getPostgresError,
  PG_CHECK_VIOLATION,
  PG_FOREIGN_KEY_VIOLATION,
  PG_INVALID_TEXT_REPRESENTATION,
  PG_UNIQUE_VIOLATION,
} from '../utils/postgres-error.util';

export interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
  requestId?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const request = host.switchToHttp().getRequest<Request>();
    const { statusCode, message } = this.resolve(exception);
    const requestId = request.headers[REQUEST_ID_HEADER] as string | undefined;

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${requestId ?? '-'}] ${request.method} ${request.path} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseBody = {
      statusCode,
      error: HttpStatus[statusCode] ?? 'ERROR',
      message,
      path: request.path,
      timestamp: new Date().toISOString(),
      requestId,
    };
    httpAdapter.reply(host.switchToHttp().getResponse(), body, statusCode);
  }

  private resolve(exception: unknown): { statusCode: number; message: string | string[] } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ?? exception.message);
      return { statusCode: exception.getStatus(), message };
    }

    switch (getPostgresError(exception)?.code) {
      case PG_UNIQUE_VIOLATION:
        return { statusCode: HttpStatus.CONFLICT, message: 'Resource already exists' };
      case PG_FOREIGN_KEY_VIOLATION:
        return {
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          message: 'Referenced resource does not exist',
        };
      case PG_CHECK_VIOLATION:
      case PG_INVALID_TEXT_REPRESENTATION:
        return { statusCode: HttpStatus.BAD_REQUEST, message: 'Invalid data' };
      default:
        return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
    }
  }
}
