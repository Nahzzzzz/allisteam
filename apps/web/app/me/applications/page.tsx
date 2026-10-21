'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  APPLY_STATUS_LABELS,
  POST_STATUS_LABELS,
  type JoinedPostSummary,
  type PostStatus,
} from '@allisteam/shared';
import { AuthGate } from '@/components/auth-gate';
import { ClockIcon } from '@/components/icons';
import { PostCardSkeleton } from '@/components/post-card-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { listMyApplications } from '@/lib/api';
import { postPrimary } from '@/lib/domain';
import { postTimeLabel } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { statusTone, toneOf } from '@/lib/tone';
import { cn } from '@/lib/utils';

export default function MyApplicationsPage() {
  return (
    <AuthGate>
      <MyApplicationsContent />
    </AuthGate>
  );
}

function MyApplicationsContent() {
  const query = useInfiniteQuery({
    queryKey: queryKeys.myApplications(),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listMyApplications(pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
  });

  const posts = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <main className="px-4 pb-24 pt-7 md:px-8 md:pb-12 md:pt-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
        Joined · 参与
      </p>
      <h1 className="mt-2 text-[28px] font-black tracking-tight">我参与的</h1>
      <p className="mt-1.5 text-sm text-ink-muted">已经通过审批、和你一起玩的局。</p>

      <div className="mt-4 flex gap-2">
        <Link
          href="/me/posts"
          className="rounded-[6px] border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
        >
          我发起的
        </Link>
        <span className="metal-fill rounded-[6px] px-3.5 py-2 text-xs font-bold text-accent-ink shadow-press">
          我参与的
        </span>
      </div>

      {query.isPending ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      ) : null}

      {query.isError ? <EmptyState title="加载失败" description="稍后重试一次。" /> : null}

      {!query.isPending && !query.isError && posts.length === 0 ? (
        <EmptyState
          title="还没有加入任何局"
          description="去首页看看有没有合适的，或者自己开一局。"
          action={
            <Link href="/" className={buttonVariants({ size: 'md' })}>
              去首页看看
            </Link>
          }
        />
      ) : null}

      <div className="mt-4 space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {posts.map((post) => (
          <JoinedPostRow key={post.id} post={post} />
        ))}
      </div>

      {query.hasNextPage ? (
        <Button
          className="mt-4"
          variant="secondary"
          size="block"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? '加载中…' : '加载更多'}
        </Button>
      ) : null}
    </main>
  );
}

function JoinedPostRow({ post }: { post: JoinedPostSummary }) {
  const cancelled = post.status === 'CANCELLED';

  return (
    <div className="metal-sheen rounded-2xl border border-line bg-surface p-4 shadow-card transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-raised">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
            toneOf(postPrimary(post)).chip,
          )}
        >
          <span className={cn('size-1.5 rounded-full', toneOf(postPrimary(post)).dot)} />
          {postPrimary(post)}
        </span>
        <Badge className={statusTone(post.status)}>
          {POST_STATUS_LABELS[post.status as PostStatus] ?? post.status}
        </Badge>
        <Badge
          className={
            cancelled
              ? 'border-line bg-surface-2 text-ink-faint'
              : 'border-lime/30 bg-lime/10 text-lime'
          }
        >
          {APPLY_STATUS_LABELS[post.applicationStatus] ?? post.applicationStatus}
        </Badge>
      </div>

      <Link
        href={`/posts/${post.id}`}
        className="mt-2.5 block font-semibold leading-snug transition-colors hover:text-accent"
      >
        {post.title}
      </Link>

      <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-ink-muted">
        <ClockIcon className="size-3.5" />
        {postTimeLabel(post)} · {post.memberCount}/{post.capacity} 人
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/posts/${post.id}/chat`}
          className={cn(buttonVariants({ size: 'sm' }), 'gap-1.5')}
        >
          局内聊天
        </Link>
        {post.status === 'CLOSED' ? (
          <Link
            href={`/posts/${post.id}/reviews`}
            className={cn(
              buttonVariants({ size: 'sm', variant: 'secondary' }),
              'border-warning/40 text-warning',
            )}
          >
            去评价队友
          </Link>
        ) : null}
      </div>
    </div>
  );
}
