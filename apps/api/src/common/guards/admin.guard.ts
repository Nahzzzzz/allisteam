import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { adminEmails } from '../../config/env';
import { EnvService } from '../../config/env.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestWithContext } from '../../types/request';
import { AppException } from '../app-exception';

/** 必须与 JwtAuthGuard 一起使用：先认证，再校验邮箱白名单 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    if (!request.user) {
      throw new AppException('UNAUTHORIZED', 401, '请先登录');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: request.user.id },
      select: { email: true },
    });

    const allowed = adminEmails(this.env.values);
    if (!user || !allowed.includes(user.email.toLowerCase())) {
      throw new AppException('FORBIDDEN', 403, '没有管理员权限');
    }

    return true;
  }
}
