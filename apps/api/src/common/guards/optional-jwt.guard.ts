import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { RequestWithContext } from '../../types/request';
import { extractBearerToken, verifyAccessToken } from './token.util';

/** 公开接口但需要知道"当前用户是谁"时使用；凭证无效按未登录处理 */
@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      return true;
    }

    try {
      const payload = await verifyAccessToken(this.jwt, token);
      request.user = { id: payload.sub };
    } catch {
      request.user = undefined;
    }
    return true;
  }
}
