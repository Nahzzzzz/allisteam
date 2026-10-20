import type { Prisma } from '@prisma/client';
import type { ReviewView } from '@allisteam/shared';

export const reviewInclude = {
  from: { select: { id: true, nickname: true, avatarKey: true } },
  to: { select: { id: true, nickname: true, avatarKey: true } },
  post: { select: { id: true, title: true } },
} satisfies Prisma.ReviewInclude;

export type ReviewWithPeople = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

export function toReviewView(review: ReviewWithPeople): ReviewView {
  return {
    id: review.id,
    postId: review.postId,
    postTitle: review.post.title,
    rating: review.rating,
    comment: review.comment,
    tags: review.tags,
    createdAt: review.createdAt.toISOString(),
    from: {
      id: review.from.id,
      nickname: review.from.nickname,
      // 存储接入前头像统一为 null，与其它接口保持一致
      avatarUrl: null,
    },
    to: {
      id: review.to.id,
      nickname: review.to.nickname,
      avatarUrl: null,
    },
  };
}
