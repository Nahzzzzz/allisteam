import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type Application } from '@prisma/client';
import type {
  ApplicationView,
  CreateApplicationInput,
  DecideApplicationInput,
  ListApplicationsQuery,
  MessageView,
  Paginated,
} from '@allisteam/shared';
import { AppException } from '../../common/app-exception';
import { decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatEventsService } from '../messages/chat-events.service';
import { MessagesService } from '../messages/messages.service';
import {
  applicationInclude,
  toApplicationView,
  type ApplicantGameProfile,
  type ApplicationWithUser,
} from './applications.mapper';

/** PRD §8.2：被拒绝后 7 天内不可重复申请 */
const REAPPLY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

interface SeatUpdateRow {
  id: string;
  memberCount: number;
  capacity: number;
  status: string;
}

interface ApplicationTarget {
  id: string;
  postId: string;
  userId: string;
  post: { authorId: string; gameId: string | null };
  user: { nickname: string };
}

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messages: MessagesService,
    private readonly chatEvents: ChatEventsService,
  ) {}

  async list(
    postId: string,
    viewerId: string,
    query: ListApplicationsQuery,
  ): Promise<Paginated<ApplicationView>> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, gameId: true },
    });
    if (!post) {
      throw new AppException('NOT_FOUND', 404, '该局不存在');
    }
    if (post.authorId !== viewerId) {
      throw new AppException('FORBIDDEN', 403, '只有发起人可以查看报名列表');
    }

    const where: Prisma.ApplicationWhereInput = { postId };
    if (query.status) {
      where.status = query.status;
    }
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      where.OR = [
        { createdAt: { gt: new Date(cursor.t) } },
        { createdAt: new Date(cursor.t), id: { gt: cursor.id } },
      ];
    }

    const rows = await this.prisma.application.findMany({
      where,
      include: applicationInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const profiles = await this.loadProfiles(
      items.map((item) => item.userId),
      post.gameId,
    );
    const last = items.at(-1);

    return {
      items: items.map((item) => toApplicationView(item, profiles.get(item.userId) ?? null)),
      hasMore,
      nextCursor:
        hasMore && last ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id }) : null,
    };
  }

  async apply(
    postId: string,
    userId: string,
    input: CreateApplicationInput,
  ): Promise<ApplicationView> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        gameId: true,
        status: true,
        memberCount: true,
        capacity: true,
      },
    });
    if (!post) {
      throw new AppException('NOT_FOUND', 404, '该局不存在');
    }
    if (post.authorId === userId) {
      throw new AppException('FORBIDDEN', 403, '不能报名自己发布的局');
    }
    if (post.memberCount >= post.capacity || post.status === 'FULL') {
      throw new AppException('POST_FULL', 409, '该局已满员');
    }
    if (post.status !== 'OPEN') {
      throw new AppException('POST_NOT_OPEN', 409, '该局当前不接受报名');
    }

    const existing = await this.prisma.application.findUnique({
      where: { postId_userId: { postId, userId } },
      select: { id: true, status: true, decidedAt: true, updatedAt: true },
    });

    if (existing) {
      this.assertReapplyAllowed(existing);
    }

    const saved = await this.prisma.$transaction(async (tx) => {
      let application: ApplicationWithUser;

      if (existing) {
        // 只允许把被拒绝/已撤回的记录重新置为待审批；期间被审批过就说明状态已被别人改动
        const refreshed = await tx.application.updateMany({
          where: { id: existing.id, status: { in: ['REJECTED', 'WITHDRAWN'] } },
          data: {
            status: 'PENDING',
            message: input.message ?? null,
            rejectReason: null,
            decidedAt: null,
            decidedById: null,
          },
        });
        if (refreshed.count === 0) {
          throw new AppException('ALREADY_APPLIED', 409, '你已报名，等待发起人审批');
        }
        application = await tx.application.findUniqueOrThrow({
          where: { id: existing.id },
          include: applicationInclude,
        });
      } else {
        try {
          application = await tx.application.create({
            data: { postId, userId, message: input.message ?? null },
            include: applicationInclude,
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new AppException('ALREADY_APPLIED', 409, '你已报名，等待发起人审批');
          }
          throw error;
        }
      }

      await tx.notification.create({
        data: {
          userId: post.authorId,
          type: 'APPLICATION_RECEIVED',
          payload: { postId, applicationId: application.id },
        },
      });

      return application;
    });

    const profile = await this.loadProfile(userId, post.gameId);
    return toApplicationView(saved, profile);
  }

  async decide(
    applicationId: string,
    hostId: string,
    input: DecideApplicationInput,
  ): Promise<ApplicationView> {
    const target = await this.findTarget(applicationId, hostId);

    return input.action === 'REJECT'
      ? this.reject(target, hostId, input.rejectReason)
      : this.approve(target, hostId);
  }

  async withdraw(applicationId: string, userId: string): Promise<{ ok: true }> {
    const result = await this.prisma.application.updateMany({
      where: { id: applicationId, userId, status: 'PENDING' },
      data: { status: 'WITHDRAWN', decidedAt: new Date() },
    });

    if (result.count === 0) {
      const application = await this.prisma.application.findUnique({
        where: { id: applicationId },
        select: { userId: true, status: true },
      });
      if (!application) {
        throw new AppException('NOT_FOUND', 404, '报名记录不存在');
      }
      if (application.userId !== userId) {
        throw new AppException('FORBIDDEN', 403, '只能撤回自己的报名');
      }
      throw new AppException('ALREADY_DECIDED', 409, '该申请已处理，无法撤回');
    }

    return { ok: true };
  }

  private async approve(target: ApplicationTarget, hostId: string): Promise<ApplicationView> {
    // 并发审批会在 Post 行锁上排队，事务里只保留必须原子的写操作；
    // 通知与系统消息放到提交之后，缩短锁持有时间，避免 10 并发时顶到事务超时。
    const seat = await this.prisma.$transaction(
      async (tx) => {
        // 1. 仅当申请仍是 PENDING 才通过，防重复点击
        const decided = await tx.application.updateMany({
          where: { id: target.id, status: 'PENDING' },
          data: {
            status: 'APPROVED',
            decidedAt: new Date(),
            decidedById: hostId,
            rejectReason: null,
          },
        });
        if (decided.count === 0) {
          throw new AppException('ALREADY_DECIDED', 409, '该申请已处理');
        }

        // 2. 原子占位：名额判断与满员置 FULL 在同一条 UPDATE 里完成
        const rows = await tx.$queryRaw<SeatUpdateRow[]>`
          UPDATE "Post"
          SET "memberCount" = "memberCount" + 1,
              "status" = CASE WHEN "memberCount" + 1 >= "capacity" THEN 'FULL'::"PostStatus" ELSE "status" END,
              "updatedAt" = now()
          WHERE "id" = ${target.postId}
            AND "memberCount" < "capacity"
            AND "status" = 'OPEN'::"PostStatus"
          RETURNING "id", "memberCount", "capacity", "status"
        `;
        if (rows.length === 0) {
          throw new AppException('POST_FULL', 409, '该局已满员或已关闭');
        }

        // 3. 建立成员关系；这一步必须和占位在同一事务，否则可能出现占位成功但没进人
        await tx.postMember.create({
          data: { postId: target.postId, userId: target.userId, role: 'MEMBER' },
        });

        return { isFull: rows[0]?.status === 'FULL' };
      },
      { timeout: 10_000 },
    );

    const application = await this.prisma.application.findUniqueOrThrow({
      where: { id: target.id },
      include: applicationInclude,
    });

    const joinedMessage = await this.writeSystemMessage(
      target.postId,
      `${target.user.nickname} 加入了局`,
    );
    const fullMessage = seat.isFull
      ? await this.writeSystemMessage(target.postId, '人数已满，成团啦')
      : null;

    const notifications: Prisma.NotificationCreateManyInput[] = [
      {
        userId: target.userId,
        type: 'APPLICATION_APPROVED',
        payload: { postId: target.postId },
      },
    ];
    if (seat.isFull) {
      notifications.push({
        userId: hostId,
        type: 'POST_FULL',
        payload: { postId: target.postId },
      });
    }
    await this.notify(notifications);

    // 事务提交后再广播，订阅者读到的消息一定已经落库
    if (joinedMessage) {
      this.chatEvents.messageCreated(joinedMessage);
    }
    this.chatEvents.memberJoined({
      postId: target.postId,
      userId: target.userId,
      nickname: target.user.nickname,
    });
    if (fullMessage) {
      this.chatEvents.messageCreated(fullMessage);
    }
    if (seat.isFull) {
      this.chatEvents.postFull(target.postId);
    }

    const profile = await this.loadProfile(target.userId, target.post.gameId);
    return toApplicationView(application, profile);
  }

  /** 系统消息是审批的附属效果，写失败只记日志，不回滚已提交的审批 */
  private async writeSystemMessage(postId: string, content: string): Promise<MessageView | null> {
    try {
      return await this.messages.appendSystemMessage(this.prisma, postId, content);
    } catch (error) {
      this.logger.warn(`系统消息写入失败 postId=${postId}：${(error as Error).message}`);
      return null;
    }
  }

  private async notify(data: Prisma.NotificationCreateManyInput[]): Promise<void> {
    try {
      await this.prisma.notification.createMany({ data });
    } catch (error) {
      this.logger.warn(`通知写入失败：${(error as Error).message}`);
    }
  }

  private async reject(
    target: ApplicationTarget,
    hostId: string,
    rejectReason: string | undefined,
  ): Promise<ApplicationView> {
    const saved = await this.prisma.$transaction(async (tx) => {
      const decided = await tx.application.updateMany({
        where: { id: target.id, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          decidedAt: new Date(),
          decidedById: hostId,
          rejectReason: rejectReason ?? null,
        },
      });
      if (decided.count === 0) {
        throw new AppException('ALREADY_DECIDED', 409, '该申请已处理');
      }

      await tx.notification.create({
        data: {
          userId: target.userId,
          type: 'APPLICATION_REJECTED',
          payload: { postId: target.postId, reason: rejectReason ?? null },
        },
      });

      return tx.application.findUniqueOrThrow({
        where: { id: target.id },
        include: applicationInclude,
      });
    });

    const profile = await this.loadProfile(target.userId, target.post.gameId);
    return toApplicationView(saved, profile);
  }

  private assertReapplyAllowed(application: Pick<Application, 'status' | 'decidedAt' | 'updatedAt'>): void {
    if (application.status === 'PENDING') {
      throw new AppException('ALREADY_APPLIED', 409, '你已报名，等待发起人审批');
    }
    if (application.status === 'APPROVED' || application.status === 'LEFT') {
      throw new AppException('ALREADY_APPLIED', 409, '你已经在这个局里');
    }
    if (application.status === 'REJECTED') {
      const decidedAt = (application.decidedAt ?? application.updatedAt).getTime();
      const retryAt = decidedAt + REAPPLY_COOLDOWN_MS;
      if (Date.now() < retryAt) {
        throw new AppException(
          'ALREADY_APPLIED',
          409,
          `被拒绝后 7 天内不能重复报名，${new Date(retryAt).toISOString()} 之后可以再试`,
          { retryAt: new Date(retryAt).toISOString() },
        );
      }
    }
  }

  private async findTarget(applicationId: string, hostId: string): Promise<ApplicationTarget> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        postId: true,
        userId: true,
        post: { select: { authorId: true, gameId: true } },
        user: { select: { nickname: true } },
      },
    });
    if (!application) {
      throw new AppException('NOT_FOUND', 404, '报名记录不存在');
    }
    if (application.post.authorId !== hostId) {
      throw new AppException('FORBIDDEN', 403, '只有发起人可以审批报名');
    }
    return application;
  }

  private async loadProfile(
    userId: string,
    gameId: string | null,
  ): Promise<ApplicantGameProfile | null> {
    if (!gameId) {
      return null;
    }
    return this.prisma.gameProfile.findFirst({
      where: { userId, gameId },
      select: { platform: true, rankText: true, voiceOk: true },
    });
  }

  private async loadProfiles(
    userIds: string[],
    gameId: string | null,
  ): Promise<Map<string, ApplicantGameProfile>> {
    const map = new Map<string, ApplicantGameProfile>();
    if (!gameId || userIds.length === 0) {
      return map;
    }
    const rows = await this.prisma.gameProfile.findMany({
      where: { userId: { in: userIds }, gameId },
      select: { userId: true, platform: true, rankText: true, voiceOk: true },
    });
    for (const row of rows) {
      if (!map.has(row.userId)) {
        map.set(row.userId, {
          platform: row.platform,
          rankText: row.rankText,
          voiceOk: row.voiceOk,
        });
      }
    }
    return map;
  }
}
