'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ReportDialog } from '@/components/report-dialog';
import { getPublicUser, listUserReviews } from '@/lib/api';
import { formatStartTime } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

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
    return <p className="px-4 py-16 text-center text-sm text-neutral-500">加载中…</p>;
  }

  if (profileQuery.isError) {
    return <p className="px-4 py-16 text-center text-sm text-neutral-500">这个用户不存在。</p>;
  }

  const profile = profileQuery.data;
  const reviews = reviewsQuery.data?.items ?? [];

  return (
    <main className="px-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{profile.nickname}</h1>
          <p className="mt-1 text-xs text-neutral-500">
            {profile.city ? `${profile.city} · ` : ''}
            信誉 {profile.trustScore} · 评价 {profile.reviewCount}
          </p>
        </div>
        <ReportDialog targetType="USER" targetId={profile.id} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Card>
          <p className="text-xs text-neutral-500">信誉分</p>
          <p className="mt-1 text-2xl font-semibold">{profile.trustScore}</p>
          <p className="mt-1 text-[11px] text-neutral-500">初始 60，收到评价后浮动</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">收到的评价</p>
          <p className="mt-1 text-2xl font-semibold">{profile.reviewCount}</p>
          <p className="mt-1 text-[11px] text-neutral-500">局结束后成员之间互评</p>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="text-base font-semibold">评价</h2>

        {reviewsQuery.isPending ? (
          <p className="mt-2 text-sm text-neutral-500">加载中…</p>
        ) : reviews.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">还没有收到评价。</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {reviews.map((review) => (
              <li key={review.id} className="rounded-lg border border-neutral-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{review.from.nickname}</span>
                  <span className="text-xs text-amber-500">{'★'.repeat(review.rating)}</span>
                </div>
                {review.comment ? (
                  <p className="mt-1 text-sm leading-relaxed text-neutral-700">{review.comment}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {review.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                  <Link
                    href={`/posts/${review.postId}`}
                    className="text-[11px] text-neutral-500 underline"
                  >
                    {review.postTitle}
                  </Link>
                  <span className="text-[11px] text-neutral-400">
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
