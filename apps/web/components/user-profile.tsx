'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ReportDialog } from '@/components/report-dialog';
import { StarIcon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { getPublicUser, listUserReviews } from '@/lib/api';
import { formatStartTime } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { toneOf } from '@/lib/tone';
import { cn } from '@/lib/utils';

function initialOf(nickname: string): string {
  return nickname.trim().slice(0, 1).toUpperCase() || '?';
}

export function UserProfileView({ userId }: { userId: string }) {
  const profileQuery = useQuery({
    queryKey: queryKeys.userProfile(userId),
    queryFn: () => getPublicUser(userId),
  });
  const reviewsQuery = useQuery({
    queryKey: queryKeys.userReviews(userId),
    queryFn: () => listUserReviews(userId),
  });

  if (profileQuery.isPending) {
    return (
      <main className="space-y-3 px-4 py-8 md:px-8">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </main>
    );
  }

  if (profileQuery.isError) {
    return <EmptyState title="这个用户不存在。" />;
  }

  const profile = profileQuery.data;
  const reviews = reviewsQuery.data?.items ?? [];

  return (
    <main className="px-4 pb-24 pt-6 md:px-8 md:pb-12 md:pt-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'grid size-12 place-items-center rounded-2xl border text-lg font-bold shadow-card',
              toneOf(profile.nickname).avatar,
            )}
          >
            {initialOf(profile.nickname)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight">{profile.nickname}</h1>
            <p className="mt-0.5 text-xs text-ink-muted">
              {profile.city ? `${profile.city} · ` : ''}
              信誉 {profile.trustScore} · 评价 {profile.reviewCount}
            </p>
          </div>
        </div>
        <ReportDialog targetType="USER" targetId={profile.id} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="metal-sheen rounded-2xl border border-line border-t-2 border-t-lime bg-surface p-4 shadow-card">
          <p className="text-[11px] text-ink-faint">信誉分</p>
          <p className="mt-1 flex items-baseline gap-1 font-mono text-2xl font-bold tabular-nums text-lime">
            {profile.trustScore}
            <span className="text-xs font-normal text-ink-faint">/ 100</span>
          </p>
          <p className="mt-1 text-[11px] text-ink-muted">初始 60，收到评价后浮动</p>
        </div>
        <div className="metal-sheen rounded-2xl border border-line border-t-2 border-t-ice bg-surface p-4 shadow-card">
          <p className="text-[11px] text-ink-faint">收到的评价</p>
          <p className="mt-1 flex items-baseline gap-1 font-mono text-2xl font-bold tabular-nums text-ice">
            {profile.reviewCount}
            <span className="text-xs font-normal text-ink-faint">条</span>
          </p>
          <p className="mt-1 text-[11px] text-ink-muted">局结束后成员之间互评</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          <span className="h-3 w-0.5 rounded-full bg-accent" />
          评价
        </h2>

        {reviewsQuery.isPending ? (
          <div className="mt-2 space-y-2">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">还没有收到评价。</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="metal-sheen rounded-2xl border border-line bg-surface p-3.5 shadow-card"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{review.from.nickname}</span>
                  <span className="inline-flex items-center gap-0.5 text-xs text-warning">
                    <StarIcon className="size-3.5" />
                    {review.rating}
                  </span>
                </div>
                {review.comment ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/90">{review.comment}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {review.tags.map((tag) => (
                    <Badge key={tag} variant="accent">
                      {tag}
                    </Badge>
                  ))}
                  <Link
                    href={`/posts/${review.postId}`}
                    className="text-[11px] text-ink-muted underline underline-offset-2 hover:text-ink"
                  >
                    {review.postTitle}
                  </Link>
                  <span className="text-[11px] text-ink-faint">
                    {formatStartTime(review.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
