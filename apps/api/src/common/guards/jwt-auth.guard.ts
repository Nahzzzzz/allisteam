import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { RequestWithContext } from '../../types/request';
import { AppException } from '../app-exception';
import { extractBearerToken, verifyAccessToken } from './token.util';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new AppException('UNAUTHORIZED', 401, '请先登录');
    }

    const payload = await verifyAccessToken(this.jwt, token);
    request.user = { id: payload.sub };
    return true;
  }
}
