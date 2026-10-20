import { Injectable } from '@nestjs/common';
import type { MeView, UpdateProfileInput } from '@allisteam/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../../common/app-exception';

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
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string): Promise<MeView> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: ME_SELECT });
    if (!user) {
      throw new AppException('NOT_FOUND', 404, '用户不存在');
    }
    return toMeView(user);
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
    return toMeView(user);
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
}

function toMeView(user: {
  id: string;
  email: string;
  nickname: string;
  bio: string | null;
  city: string | null;
  avatarKey: string | null;
  trustScore: number;
  reviewCount: number;
  createdAt: Date;
}): MeView {
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
  };
}
