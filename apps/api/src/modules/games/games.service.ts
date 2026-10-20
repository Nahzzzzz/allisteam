import { Injectable, Logger } from '@nestjs/common';
import type { GameProfileInput, GameProfileView, GameView } from '@allisteam/shared';
import { AppException } from '../../common/app-exception';
import { RedisService } from '../../common/redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

const GAMES_CACHE_KEY = 'cache:games:v1';
const GAMES_CACHE_TTL_SECONDS = 300;

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async listGames(): Promise<GameView[]> {
    try {
      const cached = await this.redis.get(GAMES_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as GameView[];
      }
    } catch (error) {
      this.logger.warn(`读取游戏缓存失败：${(error as Error).message}`);
    }

    const games = await this.prisma.game.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
    });

    const view: GameView[] = games.map((game) => ({
      id: game.id,
      name: game.name,
      coverUrl: null,
    }));

    try {
      await this.redis.setEx(GAMES_CACHE_KEY, JSON.stringify(view), GAMES_CACHE_TTL_SECONDS);
    } catch (error) {
      this.logger.warn(`写入游戏缓存失败：${(error as Error).message}`);
    }

    return view;
  }

  async listMine(userId: string): Promise<GameProfileView[]> {
    const profiles = await this.prisma.gameProfile.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        gameId: true,
        platform: true,
        rankText: true,
        voiceOk: true,
        game: { select: { name: true } },
      },
    });

    return profiles.map((profile) => ({
      id: profile.id,
      gameId: profile.gameId,
      gameName: profile.game.name,
      platform: profile.platform,
      rankText: profile.rankText,
      voiceOk: profile.voiceOk,
    }));
  }

  async addProfile(userId: string, input: GameProfileInput): Promise<GameProfileView> {
    const game = await this.prisma.game.findUnique({
      where: { id: input.gameId },
      select: { id: true, name: true, isActive: true },
    });
    if (!game || !game.isActive) {
      throw new AppException('NOT_FOUND', 404, '游戏不存在');
    }

    const existing = await this.prisma.gameProfile.findUnique({
      where: {
        userId_gameId_platform: {
          userId,
          gameId: input.gameId,
          platform: input.platform,
        },
      },
      select: { id: true },
    });
    if (existing) {
      throw new AppException('GAME_PROFILE_EXISTS', 409, '该游戏与平台已添加');
    }

    const profile = await this.prisma.gameProfile.create({
      data: {
        userId,
        gameId: input.gameId,
        platform: input.platform,
        rankText: input.rankText ?? null,
        voiceOk: input.voiceOk ?? true,
      },
      select: { id: true, gameId: true, platform: true, rankText: true, voiceOk: true },
    });

    return {
      id: profile.id,
      gameId: profile.gameId,
      gameName: game.name,
      platform: profile.platform,
      rankText: profile.rankText,
      voiceOk: profile.voiceOk,
    };
  }

  async removeProfile(userId: string, profileId: string): Promise<{ ok: true }> {
    const result = await this.prisma.gameProfile.deleteMany({
      where: { id: profileId, userId },
    });
    if (result.count === 0) {
      throw new AppException('NOT_FOUND', 404, '游戏档案不存在');
    }
    return { ok: true };
  }
}
