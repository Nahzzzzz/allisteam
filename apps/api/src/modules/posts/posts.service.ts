import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CreatePostInput,
  JoinedPostSummary,
  ListPostsQuery,
  MyApplicationsQuery,
  MyPostSummary,
  MyPostsQuery,
  Paginated,
  PostDetail,
  PostSummary,
  UpdatePostInput,
} from '@allisteam/shared';
import { AppException } from '../../common/app-exception';
import { decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatEventsService } from '../messages/chat-events.service';
import { MessagesService } from '../messages/messages.service';
import { postDetailInclude, postSummaryInclude, toPostDetail, toPostSummary } from './posts.mapper';

export interface PostReviewContext {
  id: string;
  status: string;
  startTime: Date;
  authorId: string;
  memberIds: string[];
}

@Injectable()
export class PostsService {  constructor(
    private readonly prisma: PrismaService,
    private readonly messages: MessagesService,
    private readonly chatEvents: ChatEventsService,
  ) {}

  async list(query: ListPostsQuery): Promise<Paginated<PostSummary>> {
    const now = new Date();
    const startTime: Prisma.DateTimeFilter = { gt: now };
    if (query.startFrom) {
      startTime.gte = new Date(query.startFrom);
    }
    if (query.startTo) {
      startTime.lte = new Date(query.startTo);
    }

    const where: Prisma.PostWhereInput = {
      domain: query.domain ?? 'GAME',
      status: 'OPEN',
      startTime,
    };

    if (query.gameId) {
      where.gameId = query.gameId;
    }
    if (query.city) {
      where.city = query.city;
    }
    if (query.q) {
      where.title = { contains: query.q, mode: 'insensitive' };
    }
    if (query.platform) {
      where.gameInfo = { platform: query.platform };
    }
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      where.AND = [
        {
          OR: [
            { startTime: { gt: new Date(cursor.t) } },
            { startTime: new Date(cursor.t), id: { gt: cursor.id } },
          ],
        },
      ];
    }

    const rows = await this.prisma.post.findMany({
      where,
      include: postSummaryInclude,
      orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const last = items.at(-1);

    return {
      items: items.map(toPostSummary),
      hasMore,
      nextCursor:
        hasMore && last ? encodeCursor({ t: last.startTime.toISOString(), id: last.id }) : null,
    };
  }

  async listMine(userId: string, query: MyPostsQuery): Promise<Paginated<MyPostSummary>> {
    const where: Prisma.PostWhereInput = { authorId: userId };

    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      where.OR = [
        { createdAt: { lt: new Date(cursor.t) } },
        { createdAt: new Date(cursor.t), id: { lt: cursor.id } },
      ];
    }

    const rows = await this.prisma.post.findMany({
      where,
      include: postSummaryInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const last = items.at(-1);

    // 一次 groupBy 取回本页所有局的待处理报名数，避免逐条 count
    const counts =
      items.length === 0
        ? []
        : await this.prisma.application.groupBy({
            by: ['postId'],
            where: { postId: { in: items.map((post) => post.id) }, status: 'PENDING' },
            _count: { _all: true },
          });
    const pendingByPost = new Map(counts.map((row) => [row.postId, row._count._all]));

    return {
      items: items.map((post) => ({
        ...toPostSummary(post),
        pendingApplicationCount: pendingByPost.get(post.id) ?? 0,
      })),
      hasMore,
      nextCursor:
        hasMore && last ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id }) : null,
    };
  }

  /** 「我参与的」：只返回已通过的报名，排序与游标都落在 Application.createdAt/id 上 */
  async listJoined(
    userId: string,
    query: MyApplicationsQuery,
  ): Promise<Paginated<JoinedPostSummary>> {
    const where: Prisma.ApplicationWhereInput = { userId, status: 'APPROVED' };

    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      where.OR = [
        { createdAt: { lt: new Date(cursor.t) } },
        { createdAt: new Date(cursor.t), id: { lt: cursor.id } },
      ];
    }

    const rows = await this.prisma.application.findMany({
      where,
      include: { post: { include: postSummaryInclude } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const last = items.at(-1);

    return {
      items: items.map((row) => ({
        ...toPostSummary(row.post),
        applicationId: row.id,
        applicationStatus: row.status,
        appliedAt: row.createdAt.toISOString(),
      })),
      hasMore,
      nextCursor:
        hasMore && last ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id }) : null,
    };
  }

  async detail(postId: string, viewer: { id: string } | undefined): Promise<PostDetail> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: postDetailInclude,
    });
    if (!post) {
      throw new AppException('NOT_FOUND', 404, '该局不存在');
    }

    const application = viewer
      ? await this.prisma.application.findUnique({
          where: { postId_userId: { postId, userId: viewer.id } },
          select: { id: true, status: true },
        })
      : null;

    return toPostDetail(post, viewer, application);
  }

  async create(authorId: string, input: CreatePostInput): Promise<PostDetail> {
    const startTime = new Date(input.startTime);
    if (startTime.getTime() <= Date.now()) {
      throw new AppException('VALIDATION_FAILED', 400, '参数校验失败', [
        { path: 'startTime', message: '开始时间必须晚于当前时间' },
      ]);
    }

    const game = await this.prisma.game.findUnique({
      where: { id: input.game.gameId },
      select: { id: true, isActive: true },
    });
    if (!game || !game.isActive) {
      throw new AppException('NOT_FOUND', 404, '游戏不存在');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      return tx.post.create({
        data: {
          authorId,
          domain: 'GAME',
          title: input.title,
          description: input.description,
          city: input.city ?? null,
          startTime,
          capacity: input.capacity,
          memberCount: 1,
          status: 'OPEN',
          // 反范式字段：与 GameInfo.gameId 在同一事务内写入，保证筛选不依赖 join
          gameId: game.id,
          gameInfo: {
            create: {
              gameId: game.id,
              platform: input.game.platform,
              mode: input.game.mode ?? null,
              rankMin: input.game.rankMin ?? null,
              rankMax: input.game.rankMax ?? null,
              needVoice: input.game.needVoice ?? false,
            },
          },
          members: {
            create: { userId: authorId, role: 'HOST' },
          },
        },
        include: postDetailInclude,
      });
    });

    return toPostDetail(created, { id: authorId }, null);
  }

  async update(postId: string, userId: string, input: UpdatePostInput): Promise<PostDetail> {
    const post = await this.findOwned(postId, userId);

    if (input.capacity !== undefined && input.capacity < post.memberCount) {
      throw new AppException('VALIDATION_FAILED', 400, '参数校验失败', [
        { path: 'capacity', message: `名额不能少于当前成员数 ${post.memberCount}` },
      ]);
    }

    if (input.startTime !== undefined && new Date(input.startTime).getTime() <= Date.now()) {
      throw new AppException('VALIDATION_FAILED', 400, '参数校验失败', [
        { path: 'startTime', message: '开始时间必须晚于当前时间' },
      ]);
    }

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.description === undefined ? {} : { description: input.description }),
        ...(input.city === undefined ? {} : { city: input.city }),
        ...(input.startTime === undefined ? {} : { startTime: new Date(input.startTime) }),
        ...(input.capacity === undefined ? {} : { capacity: input.capacity }),
      },
      include: postDetailInclude,
    });

    return toPostDetail(updated, { id: userId }, null);
  }

  async cancel(postId: string, userId: string): Promise<{ ok: true }> {
    const systemMessage = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.post.updateMany({
        where: { id: postId, authorId: userId, status: { in: ['OPEN', 'FULL'] } },
        data: { status: 'CANCELLED' },
      });
      if (updated.count === 0) {
        return null;
      }
      return this.messages.appendSystemMessage(tx, postId, '发起人取消了这个局，聊天已关闭');
    });

    if (!systemMessage) {
      const exists = await this.prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true },
      });
      if (!exists) {
        throw new AppException('NOT_FOUND', 404, '该局不存在');
      }
      if (exists.authorId !== userId) {
        throw new AppException('FORBIDDEN', 403, '只有发起人可以取消该局');
      }
      throw new AppException('POST_NOT_OPEN', 409, '该局当前状态不可取消');
    }

    this.chatEvents.messageCreated(systemMessage);
    this.chatEvents.postCancelled(postId);

    return { ok: true };
  }

  /** 评价资格判定所需的局信息：状态、开始时间、成员列表 */
  async getReviewContext(postId: string): Promise<PostReviewContext> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        status: true,
        startTime: true,
        authorId: true,
        members: { select: { userId: true } },
      },
    });
    if (!post) {
      throw new AppException('NOT_FOUND', 404, '该局不存在');
    }
    return {
      id: post.id,
      status: post.status,
      startTime: post.startTime,
      authorId: post.authorId,
      memberIds: post.members.map((member) => member.userId),
    };
  }

  /** 举报校验与后台展示用：确认局存在并返回可读标题 */
  async getForReport(postId: string): Promise<{ id: string; title: string; authorId: string }> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, title: true, authorId: true },
    });
    if (!post) {
      throw new AppException('NOT_FOUND', 404, '被举报的局不存在');
    }
    return post;
  }

  async titlesByIds(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.post.findMany({
      where: { id: { in: ids } },
      select: { id: true, title: true },
    });
    return new Map(rows.map((row) => [row.id, row.title]));
  }

  /** 管理员下架局：只在 OPEN/FULL 时生效，重复处理不会覆盖已结束的局 */
  async removeByAdmin(
    tx: Prisma.TransactionClient,
    postId: string,
    reason: string,
  ): Promise<{ removed: boolean; authorId: string }> {
    const post = await tx.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (!post) {
      throw new AppException('NOT_FOUND', 404, '被举报的局不存在');
    }

    const result = await tx.post.updateMany({
      where: { id: postId, status: { in: ['OPEN', 'FULL'] } },
      data: { status: 'CANCELLED', cancelReason: reason },
    });

    return { removed: result.count > 0, authorId: post.authorId };
  }

  private async findOwned(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, memberCount: true, status: true },
    });
    if (!post) {
      throw new AppException('NOT_FOUND', 404, '该局不存在');
    }
    if (post.authorId !== userId) {
      throw new AppException('FORBIDDEN', 403, '只有发起人可以修改该局');
    }
    return post;
  }
}
