'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { REVIEW_TAGS, type PostDetail, type ReviewTag, type ReviewView } from '@allisteam/shared';
import { ArrowLeftIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, createReview, getPost, listPostReviews } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatStartTime } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

/** ADR：局开始满 6 小时即可评价，与服务端 REVIEW_OPEN_AFTER_MS 保持一致 */
const REVIEW_OPEN_AFTER_MS = 6 * 60 * 60 * 1000;

export function PostReviews({ postId }: { postId: string }) {
  const myId = useAuthStore((state) => state.user?.id);
  const hydrated = useAuthStore((state) => state.hydrated);

  const postQuery = useQuery({
    queryKey: queryKeys.post(postId),
    queryFn: () => getPost(postId),
    enabled: hydrated,
  });
  const reviewsQuery = useQuery({
    queryKey: queryKeys.postReviews(postId),
    queryFn: () => listPostReviews(postId),
    enabled: hydrated,
  });

  if (postQuery.isPending || reviewsQuery.isPending) {
    return (
      <main className="space-y-3 px-4 py-6 md:px-8">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-52" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </main>
    );
  }

  if (postQuery.isError) {
    return <EmptyState title="这个局不存在或已被删除。" />;
  }

  const post = postQuery.data;
  const reviews = reviewsQuery.data?.items ?? [];
  const isMember = post.isAuthor || post.members.some((member) => member.userId === myId);
  const ended =
    post.status === 'CLOSED' ||
    new Date(post.startTime).getTime() + REVIEW_OPEN_AFTER_MS <= Date.now();

  return (
    <main className="px-4 pb-24 pt-5 md:px-8 md:pb-12 md:pt-8">
      <Link
        href={`/posts/${post.id}`}
        className="inline-flex items-center gap-1 text-xs text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeftIcon className="size-3.5" />
        返回局详情
      </Link>

      <h1 className="mt-2 text-2xl font-bold tracking-tight">评价队友</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {post.title} · {formatStartTime(post.startTime)}
      </p>

      {!isMember ? (
        <EmptyState title="只有局内成员可以评价。" />
      ) : !ended ? (
        <EmptyState title="局还没结束" description="开始 6 小时后就可以评价队友了。" />
      ) : (
        <div className="mt-4 space-y-3">
          {post.members
            .filter((member) => member.userId !== myId)
            .map((member) => (
              <ReviewTarget
                key={member.userId}
                post={post}
                toId={member.userId}
                nickname={member.nickname}
                existing={reviews.find(
                  (review) => review.from.id === myId && review.to.id === member.userId,
                )}
              />
            ))}
        </div>
      )}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          <span className="h-3 w-0.5 rounded-full bg-accent" />
          这个局收到的评价
        </h2>
        {reviews.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">还没有人评价。</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="metal-sheen rounded-2xl border border-line bg-surface p-3.5 shadow-card"
              >
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span>
                    {review.from.nickname} → {review.to.nickname}
                  </span>
                  <span className="text-warning">{'★'.repeat(review.rating)}</span>
                </div>
                {review.comment ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/90">{review.comment}</p>
                ) : null}
                <p className="mt-1.5 text-[11px] text-ink-faint">
                  {formatStartTime(review.createdAt)}
                  {review.tags.length > 0 ? ` · ${review.tags.join('/')}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function ReviewTarget({
  post,
  toId,
  nickname,
  existing,
}: {
  post: PostDetail;
  toId: string;
  nickname: string;
  existing: ReviewView | undefined;
}) {
  const queryClient = useQueryClient();

  if (existing) {
    return (
      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{nickname}</p>
          <p className="mt-1 text-xs text-ink-muted">
            <span className="text-warning">{'★'.repeat(existing.rating)}</span>
            {existing.tags.length > 0 ? ` · ${existing.tags.join('/')}` : ''}
          </p>
        </div>
        <span className="text-xs text-ink-faint">已评价</span>
      </Card>
    );
  }

  return (
    <ReviewForm
      postId={post.id}
      toId={toId}
      nickname={nickname}
      onDone={() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.postReviews(post.id) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.userProfile(toId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.userReviews(toId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.post(post.id) });
      }}
    />
  );
}

function ReviewForm({
  postId,
  toId,
  nickname,
  onDone,
}: {
  postId: string;
  toId: string;
  nickname: string;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<ReviewTag[]>([]);
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      createReview(postId, {
        toId,
        rating,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
        ...(tags.length > 0 ? { tags } : {}),
      }),
    onSuccess: () => {
      toast.success(`已评价 ${nickname}`);
      onDone();
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : '评价失败，请稍后再试');
    },
  });

  const toggleTag = (tag: ReviewTag): void => {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((value) => value !== tag)
        : current.length >= 3
          ? current
          : [...current, tag],
    );
  };

  return (
    <Card className="space-y-3">
      <p className="text-sm font-semibold">评价 {nickname}</p>

      <div className="flex items-center gap-1" role="group" aria-label="评分">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} 星`}
            aria-pressed={rating === value}
            onClick={() => setRating(value)}
            className={cn(
              'flex size-11 items-center justify-center rounded-xl text-2xl transition-colors',
              rating >= value
                ? 'text-warning'
                : 'text-ink-faint/50 hover:bg-surface-2 hover:text-ink-faint',
            )}
          >
            ★
          </button>
        ))}
        <span className="ml-1 text-xs text-ink-muted">
          {rating > 0 ? `${rating} 星` : '请打分'}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {REVIEW_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            aria-pressed={tags.includes(tag)}
            className={cn(
              'min-h-11 rounded-full border px-3 text-xs transition-colors',
              tags.includes(tag)
                ? 'border-accent bg-accent/15 font-medium text-accent'
                : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      <Textarea
        maxLength={200}
        placeholder="可选：说说这次一起玩的感受"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />

      <Button
        size="block"
        disabled={rating === 0 || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? '提交中…' : '提交评价'}
      </Button>
    </Card>
  );
}
