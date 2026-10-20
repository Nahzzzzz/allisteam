import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateReviewInput,
  ListReviewsQuery,
  Paginated,
  ReviewView,
} from '@allisteam/shared';
import { AppException } from '../../common/app-exception';
import { decodeCursor, encodeCursor } from '../../common/pagination/cursor';
import { PrismaService } from '../../prisma/prisma.service';
import { PostsService } from '../posts/posts.service';
import { UsersService } from '../users/users.service';
import { reviewInclude, toReviewView, type ReviewWithPeople } from './reviews.mapper';
import { nextTrustScore } from '../../common/util/reputation';

/** PRD US-09：局开始 6 小时后视为已结束，成员之间可互评 */
export const REVIEW_OPEN_AFTER_MS = 6 * 60 * 60 * 1000;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly posts: PostsService,
    private readonly users: UsersService,
  ) {}

  async create(postId: string, fromId: string, input: CreateReviewInput): Promise<ReviewView> {
    const context = await this.posts.getReviewContext(postId);

    if (context.status === 'CANCELLED') {
      throw new AppException('POST_NOT_OPEN', 409, '该局已取消，不能评价');
    }
    const ended =
      context.status === 'CLOSED' ||
      context.startTime.getTime() + REVIEW_OPEN_AFTER_MS <= Date.now();
    if (!ended) {
      throw new AppException('POST_NOT_ENDED', 409, '局还没结束，开始 6 小时后才能评价');
    }
    if (!context.memberIds.includes(fromId)) {
      throw new AppException('NOT_POST_MEMBER', 403, '只有局内成员可以评价');
    }
    if (input.toId === fromId) {
      throw new AppException('FORBIDDEN', 403, '不能评价自己');
    }
    if (!context.memberIds.includes(input.toId)) {
      throw new AppException('NOT_FOUND', 404, '被评价的用户不在这个局里');
    }

    const review = await this.prisma.$transaction(async (tx) => {
      let created: ReviewWithPeople;
      try {
        created = await tx.review.create({
          data: {
            postId,
            fromId,
            toId: input.toId,
            rating: input.rating,
            comment: input.comment ?? null,
            tags: input.tags ?? [],
          },
          include: reviewInclude,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new AppException('ALREADY_REVIEWED', 409, '你已经评价过这位队友了');
        }
        throw error;
      }

      // 同一用户可能同时收到多条评价，行锁保证每次都在最新分数上计算
      const rows = await tx.$queryRaw<{ trustScore: number }[]>`
        SELECT "trustScore" FROM "User" WHERE "id" = ${input.toId} FOR UPDATE
      `;
      const current = rows[0]?.trustScore;
      if (current === undefined) {
        throw new AppException('NOT_FOUND', 404, '被评价的用户不存在');
      }

      await tx.user.update({
        where: { id: input.toId },
        data: {
          trustScore: nextTrustScore(current, input.rating),
          reviewCount: { increment: 1 },
        },
      });

      await tx.notification.create({
        data: {
          userId: input.toId,
          type: 'REVIEW_RECEIVED',
          payload: {
            postId,
            reviewId: created.id,
            rating: input.rating,
            fromNickname: created.from.nickname,
          },
        },
      });

      return created;
    });

    return toReviewView(review);
  }

  async listForPost(postId: string, query: ListReviewsQuery): Promise<Paginated<ReviewView>> {
    await this.posts.getReviewContext(postId);

    const where: Prisma.ReviewWhereInput = { postId };
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      where.OR = [
        { createdAt: { gt: new Date(cursor.t) } },
        { createdAt: new Date(cursor.t), id: { gt: cursor.id } },
      ];
    }

    const rows = await this.prisma.review.findMany({
      where,
      include: reviewInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const last = items.at(-1);

    return {
      items: items.map(toReviewView),
      hasMore,
      nextCursor:
        hasMore && last ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id }) : null,
    };
  }

  async listForUser(userId: string, query: ListReviewsQuery): Promise<Paginated<ReviewView>> {
    await this.users.getPublic(userId);

    const where: Prisma.ReviewWhereInput = { toId: userId };
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      where.OR = [
        { createdAt: { lt: new Date(cursor.t) } },
        { createdAt: new Date(cursor.t), id: { lt: cursor.id } },
      ];
    }

    const rows = await this.prisma.review.findMany({
      where,
      include: reviewInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
    });

    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    const last = items.at(-1);

    return {
      items: items.map(toReviewView),
      hasMore,
      nextCursor:
        hasMore && last ? encodeCursor({ t: last.createdAt.toISOString(), id: last.id }) : null,
    };
  }
}
