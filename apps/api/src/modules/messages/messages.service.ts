import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ListMessagesQuery, MessageView, Paginated } from '@allisteam/shared';
import { AppException } from '../../common/app-exception';
import { decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { PrismaService } from '../../prisma/prisma.service';
import { messageInclude, toMessageView, type MessageWithSender } from './messages.mapper';

interface ChatPost {
  id: string;
  authorId: string;
  status: string;
}

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 聊天权限：发起人或已通过成员，其他人一律 403。
   * REST 历史与 WebSocket 入房都走这里，避免两处判断漂移。
   */
  async assertMember(postId: string, userId: string): Promise<ChatPost> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, status: true },
    });
    if (!post) {
      throw new AppException('NOT_FOUND', 404, '该局不存在');
    }
    if (post.authorId === userId) {
      return post;
    }

    const member = await this.prisma.postMember.findUnique({
      where: { postId_userId: { postId, userId } },
      select: { userId: true },
    });
    if (!member) {
      throw new AppException('NOT_POST_MEMBER', 403, '只有局内成员可以进入聊天');
    }
    return post;
  }

  async history(
    postId: string,
    userId: string,
    query: ListMessagesQuery,
  ): Promise<Paginated<MessageView>> {
    await this.assertMember(postId, userId);

    if (query.after) {
      return this.catchUp(postId, query.after, query.limit);
    }

    const where: Prisma.MessageWhereInput = { postId };
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      where.OR = [
        { createdAt: { lt: new Date(cursor.t) } },
        { createdAt: new Date(cursor.t), id: { lt: cursor.id } },
      ];
    }

    const rows = await this.prisma.message.findMany({
      where,
      include: messageInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    return this.paginate(rows, query.limit);
  }

  async send(postId: string, userId: string, content: string): Promise<MessageView> {
    const post = await this.assertMember(postId, userId);
    if (post.status === 'CANCELLED') {
      throw new AppException('POST_NOT_OPEN', 409, '该局已取消，聊天已关闭');
    }
    if (post.status === 'CLOSED') {
      throw new AppException('POST_NOT_OPEN', 409, '该局已结束，聊天已关闭');
    }

    const message = await this.prisma.message.create({
      data: { postId, senderId: userId, type: 'TEXT', content },
      include: messageInclude,
    });
    return toMessageView(message);
  }

  /** 系统消息由审批/取消等业务流程写入，必须复用调用方的事务 */
  async appendSystemMessage(
    tx: Prisma.TransactionClient,
    postId: string,
    content: string,
  ): Promise<MessageView> {
    const message = await tx.message.create({
      data: { postId, type: 'SYSTEM', content },
      include: messageInclude,
    });
    return toMessageView(message);
  }

  /** 断线补偿：返回 anchor 之后的消息，升序 */
  private async catchUp(
    postId: string,
    after: string,
    limit: number,
  ): Promise<Paginated<MessageView>> {
    const anchor = await this.prisma.message.findFirst({
      where: { id: after, postId },
      select: { id: true, createdAt: true },
    });
    if (!anchor) {
      throw new AppException('NOT_FOUND', 404, '锚点消息不存在');
    }

    const rows = await this.prisma.message.findMany({
      where: {
        postId,
        OR: [
          { createdAt: { gt: anchor.createdAt } },
          { createdAt: anchor.createdAt, id: { gt: anchor.id } },
        ],
      },
      include: messageInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });

    return this.paginate(rows, limit);
  }

  private paginate(rows: MessageWithSender[], limit: number): Paginated<MessageView> {
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items.at(-1);

    return {
      items: items.map(toMessageView),
      hasMore,
      nextCursor:
        hasMore && last ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id }) : null,
    };
  }
}
