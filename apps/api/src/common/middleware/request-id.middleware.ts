import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { RequestWithContext } from '../../types/request';

/** 透传或生成 requestId，异常响应与日志都用它串联 */
export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const incoming = request.header('x-request-id');
  const requestId = incoming && incoming.length <= 128 ? incoming : randomUUID();
  (request as RequestWithContext).requestId = requestId;
  response.setHeader('x-request-id', requestId);
  next();
}
