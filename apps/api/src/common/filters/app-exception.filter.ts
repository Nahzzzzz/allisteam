import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import type { AppErrorBody, ErrorCode } from '@allisteam/shared';
import { AppException } from '../app-exception';
import type { RequestWithContext } from '../../types/request';

interface ErrorPayload {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithContext>();

    const { status, payload } = this.toResponse(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${status} ${payload.code}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: AppErrorBody = {
      code: payload.code,
      message: payload.message,
      ...(payload.details === undefined ? {} : { details: payload.details }),
      ...(request.requestId ? { requestId: request.requestId } : {}),
    };

    response.status(status).json(body);
  }

  private toResponse(exception: unknown): { status: number; payload: ErrorPayload } {
    if (exception instanceof AppException) {
      const response = exception.getResponse() as {
        code: ErrorCode;
        message: string;
        details?: unknown;
      };
      return {
        status: exception.getStatus(),
        payload: {
          code: response.code ?? exception.code,
          message: response.message ?? exception.message,
          details: response.details,
        },
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        return {
          status: HttpStatus.NOT_FOUND,
          payload: { code: 'NOT_FOUND', message: '资源不存在' },
        };
      }
      if (exception.code === 'P2002') {
        return {
          status: HttpStatus.CONFLICT,
          payload: { code: 'ALREADY_APPLIED', message: '记录已存在' },
        };
      }
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : ((response as { message?: string | string[] }).message ?? exception.message);
      const code: ErrorCode =
        status === HttpStatus.UNAUTHORIZED
          ? 'UNAUTHORIZED'
          : status === HttpStatus.FORBIDDEN
            ? 'FORBIDDEN'
            : status === HttpStatus.NOT_FOUND
              ? 'NOT_FOUND'
              : status === HttpStatus.TOO_MANY_REQUESTS
                ? 'RATE_LIMITED'
                : 'VALIDATION_FAILED';
      return {
        status,
        payload: { code, message: Array.isArray(message) ? message.join('; ') : message },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      payload: { code: 'INTERNAL_ERROR', message: '服务器开小差了，请稍后再试' },
    };
  }
}
