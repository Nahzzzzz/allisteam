import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CreateReportInput,
  HandleReportInput,
  ListReportsQuery,
  Paginated,
  ReportAction,
  ReportTargetType,
  ReportView,
} from '@allisteam/shared';
import { AppException } from '../../common/app-exception';
import { decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { PrismaService } from '../../prisma/prisma.service';
import { MessagesService } from '../messages/messages.service';
import { PostsService } from '../posts/posts.service';
import { UsersService } from '../users/users.service';
import {
  DELETED_TARGET_LABEL,
  reportInclude,
  toReportView,
  type ReportWithReporter,
} from './reports.mapper';

/** PRD US-10：同一用户对同一目标 24 小时内只能举报一次 */
export const REPORT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** 各举报对象类型允许的管理动作，避免对消息执行封禁之类无意义的操作 */
const ALLOWED_ACTIONS: Record<ReportTargetType, ReportAction[]> = {
  POST: ['REMOVE_POST', 'BAN_USER', 'REJECT'],
  USER: ['BAN_USER', 'REJECT'],
  MESSAGE: ['REJECT'],
};

interface ResolvedTarget {
  label: string;
  /** 被举报对象归属的用户，用于封禁与扣分；取不到时为 null */
  ownerUserId: string | null;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posts: PostsService,
    private readonly users: UsersService,
    private readonly messages: MessagesService,
  ) {}

  async create(reporterId: string, input: CreateReportInput): Promise<ReportView> {
    if (input.targetType === 'USER' && input.targetId === reporterId) {
      throw new AppException('FORBIDDEN', 403, '不能举报自己');
    }

    const target = await this.resolveTarget(input.targetType, input.targetId, true);

    const since = new Date(Date.now() - REPORT_COOLDOWN_MS);
    const recent = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        createdAt: { gt: since },
      },
      select: { createdAt: true },
    });
    if (recent) {
      const retryAt = new Date(recent.createdAt.getTime() + REPORT_COOLDOWN_MS).toISOString();
      throw new AppException(
        'REPORT_DUPLICATE',
        409,
        `同一目标 24 小时内只能举报一次，${retryAt} 之后可以再试`,
        { retryAt },
      );
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        detail: input.detail ?? null,
      },
      include: reportInclude,
    });

    return toReportView(report, target?.label ?? DELETED_TARGET_LABEL);
  }

  /** 后台队列：默认只看到待处理的，按提交时间从早到晚，先到先处理 */
  async list(query: ListReportsQuery): Promise<Paginated<ReportView>> {
    const where: Prisma.ReportWhereInput = {};
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

    const rows = await this.prisma.report.findMany({
      where,
      include: reportInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const labels = await this.labelsFor(items);
    const last = items.at(-1);

    return {
      items: items.map((report) => toReportView(report, labels.get(report.id) ?? null)),
      hasMore,
      nextCursor:
        hasMore && last ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id }) : null,
    };
  }

  async handle(reportId: string, adminId: string, input: HandleReportInput): Promise<ReportView> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: reportInclude,
    });
    if (!report) {
      throw new AppException('NOT_FOUND', 404, '举报不存在');
    }
    if (!ALLOWED_ACTIONS[report.targetType].includes(input.action)) {
      throw new AppException('VALIDATION_FAILED', 400, '该处理动作不适用于这个举报对象', [
        { path: 'action', message: `${report.targetType} 只支持 ${ALLOWED_ACTIONS[report.targetType].join('/')}` },
      ]);
    }

    const target = await this.resolveTarget(report.targetType, report.targetId, false);

    const handled = await this.prisma.$transaction(async (tx) => {
      // 条件更新保证两个管理员同时点「封禁」时只有一个人生效
      const updated = await tx.report.updateMany({
        where: { id: reportId, status: { in: ['PENDING', 'REVIEWING'] } },
        data: {
          status: input.action === 'REJECT' ? 'REJECTED' : 'RESOLVED',
          handledById: adminId,
          handledAt: new Date(),
        },
      });
      if (updated.count === 0) {
        throw new AppException('ALREADY_DECIDED', 409, '该举报已处理');
      }

      const notifications: Prisma.NotificationCreateManyInput[] = [];
      let penalizedUserId: string | null = null;

      if (input.action === 'REMOVE_POST') {
        const removed = await this.posts.removeByAdmin(tx, report.targetId, '因举报被管理员下架');
        if (removed.removed) {
          penalizedUserId = removed.authorId;
          notifications.push({
            userId: removed.authorId,
            type: 'POST_CANCELLED',
            payload: { postId: report.targetId, reason: '举报被采纳，局已下架' },
          });
        }
      } else if (input.action === 'BAN_USER') {
        const userId = report.targetType === 'USER' ? report.targetId : target?.ownerUserId;
        if (!userId) {
          throw new AppException('NOT_FOUND', 404, '找不到要封禁的用户');
        }
        const banned = await this.users.suspendByAdmin(tx, userId);
        if (banned) {
          penalizedUserId = userId;
        }
      }

      if (penalizedUserId) {
        await this.users.applyTrustPenalty(tx, penalizedUserId);
      }

      // 举报人只会收到处理结果，不会看到被举报人身份之外的额外信息
      notifications.push({
        userId: report.reporterId,
        type: 'REPORT_RESULT',
        payload: {
          reportId,
          action: input.action,
          status: input.action === 'REJECT' ? 'REJECTED' : 'RESOLVED',
          note: input.note ?? null,
        },
      });
      await tx.notification.createMany({ data: notifications });

      return tx.report.findUniqueOrThrow({ where: { id: reportId }, include: reportInclude });
    });

    return toReportView(handled, target?.label ?? DELETED_TARGET_LABEL);
  }

  private async resolveTarget(
    targetType: ReportTargetType,
    targetId: string,
    strict: boolean,
  ): Promise<ResolvedTarget | null> {
    try {
      if (targetType === 'POST') {
        const post = await this.posts.getForReport(targetId);
        return { label: `局「${post.title}」`, ownerUserId: post.authorId };
      }
      if (targetType === 'USER') {
        const user = await this.users.getPublic(targetId);
        return { label: `用户「${user.nickname}」`, ownerUserId: user.id };
      }
      const message = await this.messages.getForReport(targetId);
      return {
        label: `消息「${message.content.slice(0, 20)}」`,
        ownerUserId: message.senderId,
      };
    } catch (error) {
      if (strict) {
        throw error;
      }
      return null;
    }
  }

  /** 一次列表只做三次批量查询，避免逐条 N+1 */
  private async labelsFor(rows: ReportWithReporter[]): Promise<Map<string, string>> {
    const postIds = rows.filter((r) => r.targetType === 'POST').map((r) => r.targetId);
    const userIds = rows.filter((r) => r.targetType === 'USER').map((r) => r.targetId);
    const messageIds = rows.filter((r) => r.targetType === 'MESSAGE').map((r) => r.targetId);

    const [posts, users, messages] = await Promise.all([
      this.posts.titlesByIds(postIds),
      this.users.nicknamesByIds(userIds),
      this.messages.excerptsByIds(messageIds),
    ]);

    const labels = new Map<string, string>();
    for (const row of rows) {
      if (row.targetType === 'POST') {
        const title = posts.get(row.targetId);
        labels.set(row.id, title ? `局「${title}」` : DELETED_TARGET_LABEL);
      } else if (row.targetType === 'USER') {
        const nickname = users.get(row.targetId);
        labels.set(row.id, nickname ? `用户「${nickname}」` : DELETED_TARGET_LABEL);
      } else {
        const content = messages.get(row.targetId);
        labels.set(row.id, content ? `消息「${content.slice(0, 20)}」` : DELETED_TARGET_LABEL);
      }
    }
    return labels;
  }
}
