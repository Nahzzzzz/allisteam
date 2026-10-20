import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { MeView, UpdateProfileInput } from '@allisteam/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/app-exception';
import { REPORT_PENALTY, penalizeTrustScore } from '../../common/util/reputation';
import { adminEmails } from '../../config/env';
import { EnvService } from '../../config/env.service';

const ME_SELECT = {
  id: true,
  email: true,
  nickname: true,
  bio: true,
  city: true,
  avatarKey: true,
  trustScore: true,
  reviewCount: true,
  createdAt: true,
} as const;

const PUBLIC_SELECT = {
  id: true,
  nickname: true,
  city: true,
  avatarKey: true,
  trustScore: true,
  reviewCount: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
  ) {}

  async getMe(userId: string): Promise<MeView> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: ME_SELECT });
    if (!user) {
      throw new AppException('NOT_FOUND', 404, '用户不存在');
    }
    return toMeView(user, this.isAdmin(user.email));
  }

  async updateMe(userId: string, input: UpdateProfileInput): Promise<MeView> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.nickname === undefined ? {} : { nickname: input.nickname }),
        ...(input.bio === undefined ? {} : { bio: input.bio }),
        ...(input.city === undefined ? {} : { city: input.city }),
      },
      select: ME_SELECT,
    });
    return toMeView(user, this.isAdmin(user.email));
  }

  private isAdmin(email: string): boolean {
    return adminEmails(this.env.values).includes(email.toLowerCase());
  }

  async getPublic(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PUBLIC_SELECT,
    });
    if (!user) {
      throw new AppException('NOT_FOUND', 404, '用户不存在');
    }
    return {
      id: user.id,
      nickname: user.nickname,
      city: user.city,
      avatarUrl: null,
      trustScore: user.trustScore,
      reviewCount: user.reviewCount,
    };
  }

  async nicknamesByIds(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, nickname: true },
    });
    return new Map(rows.map((row) => [row.id, row.nickname]));
  }

  /** 封禁：只对 ACTIVE 生效，并同时吊销刷新令牌，避免继续续期 */
  async suspendByAdmin(tx: Prisma.TransactionClient, userId: string): Promise<boolean> {
    const result = await tx.user.updateMany({
      where: { id: userId, status: 'ACTIVE' },
      data: { status: 'SUSPENDED' },
    });
    if (result.count > 0) {
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return result.count > 0;
  }

  /** 举报成立扣分：行锁 + 纯函数计算，避免多条评价/举报并发时互相覆盖 */
  async applyTrustPenalty(
    tx: Prisma.TransactionClient,
    userId: string,
    points: number = REPORT_PENALTY,
  ): Promise<void> {
    const rows = await tx.$queryRaw<{ trustScore: number }[]>`
      SELECT "trustScore" FROM "User" WHERE "id" = ${userId} FOR UPDATE
    `;
    const current = rows[0]?.trustScore;
    if (current === undefined) {
      return;
    }
    await tx.user.update({
      where: { id: userId },
      data: { trustScore: penalizeTrustScore(current, points) },
    });
  }
}

function toMeView(
  user: {
    id: string;
    email: string;
    nickname: string;
    bio: string | null;
    city: string | null;
    avatarKey: string | null;
    trustScore: number;
    reviewCount: number;
    createdAt: Date;
  },
  isAdmin: boolean,
): MeView {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    bio: user.bio,
    city: user.city,
    // 存储未接入前统一为 null，接入对象存储后由 key 拼出 CDN 地址
    avatarUrl: null,
    trustScore: user.trustScore,
    reviewCount: user.reviewCount,
    createdAt: user.createdAt.toISOString(),
    isAdmin,
  };
}
