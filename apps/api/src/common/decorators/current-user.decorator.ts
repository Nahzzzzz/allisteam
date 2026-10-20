import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { AuthUser } from '../../types/auth-user';
import type { RequestWithContext } from '../../types/request';

/** 取出 JwtAuthGuard 写入的用户；未登录时为 undefined */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser | undefined => {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    return request.user;
  },
);
