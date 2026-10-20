import type { Prisma } from '@prisma/client';
import type { ApplicationProfile, ApplicationView } from '@allisteam/shared';

export const applicationInclude = {
  user: {
    select: {
      id: true,
      nickname: true,
      city: true,
      trustScore: true,
      reviewCount: true,
    },
  },
} satisfies Prisma.ApplicationInclude;

export type ApplicationWithUser = Prisma.ApplicationGetPayload<{
  include: typeof applicationInclude;
}>;

export interface ApplicantGameProfile {
  platform: string;
  rankText: string | null;
  voiceOk: boolean;
}

export function toApplicationView(
  application: ApplicationWithUser,
  profile: ApplicantGameProfile | null,
): ApplicationView {
  const profileView: ApplicationProfile | null = profile
    ? { platform: profile.platform, rankText: profile.rankText, voiceOk: profile.voiceOk }
    : null;

  return {
    id: application.id,
    postId: application.postId,
    status: application.status,
    message: application.message,
    rejectReason: application.rejectReason,
    createdAt: application.createdAt.toISOString(),
    decidedAt: application.decidedAt?.toISOString() ?? null,
    applicant: {
      id: application.user.id,
      nickname: application.user.nickname,
      avatarUrl: null,
      city: application.user.city,
      trustScore: application.user.trustScore,
      reviewCount: application.user.reviewCount,
      profile: profileView,
    },
  };
}
