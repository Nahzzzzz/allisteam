'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { POST_STATUS_LABELS, type MyPostSummary, type PostStatus } from '@allisteam/shared';
import { AuthGate } from '@/components/auth-gate';
import { ClockIcon } from '@/components/icons';
import { PostCardSkeleton } from '@/components/post-card-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cancelPost, listMyPosts } from '@/lib/api';
import { postPrimary } from '@/lib/domain';
import { postTimeLabel } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { statusTone, toneOf } from '@/lib/tone';
import { cn } from '@/lib/utils';

export default function MyPostsPage() {
  return (
    <AuthGate>
      <MyPostsContent />
    </AuthGate>
  );
}

function MyPostsContent() {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: queryKeys.myPosts(),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listMyPosts(pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
  });

  const cancel = useMutation({
    mutationFn: cancelPost,
    onSuccess: () => {
      toast.success('已取消该局');
      void queryClient.invalidateQueries({ queryKey: queryKeys.myPosts() });
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const posts = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <main className="px-4 pb-24 pt-7 md:px-8 md:pb-12 md:pt-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
        My Posts · 发起
      </p>
      <h1 className="mt-2 text-[28px] font-black tracking-tight">我发起的</h1>
      <p className="mt-1.5 text-sm text-ink-muted">待处理报名、取消局都在这里。</p>

      <div className="mt-4 flex gap-2">
        <span className="metal-fill rounded-[6px] px-3.5 py-2 text-xs font-bold text-accent-ink shadow-press">
          我发起的
        </span>
        <Link
          href="/me/applications"
          className="rounded-[6px] border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
        >
          我参与的
        </Link>
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
          title="还没有发起过局"
          description="写清时间、游戏和条件，等人来报名。"
          action={
            <Link href="/posts/new" className={buttonVariants({ size: 'md' })}>
              发一个
            </Link>
          }
        />
      ) : null}

      <div className="mt-4 space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
        {posts.map((post) => (
          <MyPostRow
            key={post.id}
            post={post}
            cancelling={cancel.isPending}
            onCancel={() => {
              if (window.confirm('确定要取消这个局吗？取消后不能再恢复。')) {
                cancel.mutate(post.id);
              }
            }}
          />
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

function MyPostRow({
  post,
  cancelling,
  onCancel,
}: {
  post: MyPostSummary;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const cancellable = post.status === 'OPEN' || post.status === 'FULL';

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

      {post.pendingApplicationCount > 0 ? (
        <Link
          href={`/posts/${post.id}`}
          className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-warning/12 px-2.5 py-1 text-xs font-medium text-warning"
        >
          待处理 {post.pendingApplicationCount} 条报名
        </Link>
      ) : null}

      {cancellable ? (
        <Button
          className="mt-3"
          variant="danger"
          size="sm"
          disabled={cancelling}
          onClick={onCancel}
        >
          取消这个局
        </Button>
      ) : null}
    </div>
  );
}
