import type { Prisma } from '@prisma/client';
import type { PostDetail, PostMemberView, PostSummary, PublicUser } from '@allisteam/shared';

export const authorSelect = {
  id: true,
  nickname: true,
  city: true,
  avatarKey: true,
  trustScore: true,
  reviewCount: true,
} as const;

export const postSummaryInclude = {
  author: { select: authorSelect },
  game: { select: { id: true, name: true } },
  gameInfo: {
    select: { platform: true, mode: true, rankMin: true, rankMax: true, needVoice: true },
  },
} satisfies Prisma.PostInclude;

export const postDetailInclude = {
  ...postSummaryInclude,
  members: {
    include: { user: { select: { id: true, nickname: true, avatarKey: true } } },
    orderBy: { joinedAt: 'asc' },
  },
} satisfies Prisma.PostInclude;

export type PostForSummary = Prisma.PostGetPayload<{ include: typeof postSummaryInclude }>;
export type PostForDetail = Prisma.PostGetPayload<{ include: typeof postDetailInclude }>;

function toPublicUser(author: {
  id: string;
  nickname: string;
  city: string | null;
  avatarKey: string | null;
  trustScore: number;
  reviewCount: number;
}): PublicUser {
  return {
    id: author.id,
    nickname: author.nickname,
    avatarUrl: null,
    city: author.city,
    trustScore: author.trustScore,
    reviewCount: author.reviewCount,
  };
}

export function toPostSummary(post: PostForSummary): PostSummary {
  return {
    id: post.id,
    title: post.title,
    domain: post.domain,
    game: post.game ? { id: post.game.id, name: post.game.name } : null,
    platform: post.gameInfo?.platform ?? null,
    mode: post.gameInfo?.mode ?? null,
    rankMin: post.gameInfo?.rankMin ?? null,
    rankMax: post.gameInfo?.rankMax ?? null,
    needVoice: post.gameInfo?.needVoice ?? false,
    startTime: post.startTime.toISOString(),
    capacity: post.capacity,
    memberCount: post.memberCount,
    status: post.status,
    author: toPublicUser(post.author),
  };
}

export function toPostDetail(
  post: PostForDetail,
  viewer: { id: string } | undefined,
  myApplication: { id: string; status: string } | null,
): PostDetail {
  const members: PostMemberView[] = post.members.map((member) => ({
    userId: member.user.id,
    nickname: member.user.nickname,
    avatarUrl: null,
    role: member.role,
    joinedAt: member.joinedAt.toISOString(),
  }));

  return {
    ...toPostSummary(post),
    description: post.description,
    city: post.city,
    members,
    isAuthor: viewer !== undefined && viewer.id === post.authorId,
    myApplicationStatus: myApplication?.status ?? null,
    myApplicationId: myApplication?.id ?? null,
  };
}
