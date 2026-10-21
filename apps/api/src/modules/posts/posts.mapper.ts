import type { Prisma } from '@prisma/client';
import type {
  ConcertSummary,
  PostDetail,
  PostMemberView,
  PostSummary,
  PublicUser,
  TravelSummary,
} from '@allisteam/shared';

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
  concertInfo: {
    select: {
      artist: true,
      tourName: true,
      venue: true,
      seatType: true,
      hasTicket: true,
      ticketNote: true,
    },
  },
  travelInfo: {
    select: {
      destination: true,
      budgetMin: true,
      budgetMax: true,
      transport: true,
      intensity: true,
      shareRoom: true,
    },
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

function toConcertSummary(
  info: PostForSummary['concertInfo'],
): ConcertSummary | null {
  if (!info) {
    return null;
  }
  return {
    artist: info.artist,
    tourName: info.tourName,
    venue: info.venue,
    seatType: info.seatType,
    hasTicket: info.hasTicket,
    ticketNote: info.ticketNote,
  };
}

function toTravelSummary(info: PostForSummary['travelInfo']): TravelSummary | null {
  if (!info) {
    return null;
  }
  return {
    destination: info.destination,
    budgetMin: info.budgetMin,
    budgetMax: info.budgetMax,
    transport: info.transport,
    intensity: info.intensity,
    shareRoom: info.shareRoom,
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
    concert: toConcertSummary(post.concertInfo),
    travel: toTravelSummary(post.travelInfo),
    startTime: post.startTime.toISOString(),
    endTime: post.endTime ? post.endTime.toISOString() : null,
    city: post.city,
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
