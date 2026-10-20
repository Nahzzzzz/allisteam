'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import type { PostSummary } from '@allisteam/shared';
import { AuthGate } from '@/components/auth-gate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cancelPost, listMyPosts } from '@/lib/api';
import { formatStartTime, relativeDayLabel } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

const STATUS_LABELS: Record<string, string> = {
  OPEN: '招募中',
  FULL: '已满员',
  CLOSED: '已结束',
  CANCELLED: '已取消',
};

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
    <main className="px-4 py-6">
      <h1 className="text-xl font-semibold">我发起的</h1>
      <p className="mt-1 text-xs text-neutral-500">待处理报名、取消局都在这里。</p>

      {query.isPending ? (
        <p className="py-10 text-center text-sm text-neutral-500">加载中…</p>
      ) : null}

      {query.isError ? (
        <p className="py-10 text-center text-sm text-neutral-500">加载失败，请稍后重试</p>
      ) : null}

      {!query.isPending && posts.length === 0 ? (
        <div className="py-12 text-center text-sm text-neutral-500">
          <p>还没有发起过局</p>
          <p className="mt-2">
            <Link href="/posts/new" className="font-medium text-neutral-900 underline">
              发一个
            </Link>
          </p>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
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
  post: PostSummary;
  cancelling: boolean;
  onCancel: () => void;
}) {
  const cancellable = post.status === 'OPEN' || post.status === 'FULL';

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Badge>{post.game?.name ?? '游戏'}</Badge>
        <Badge
          className={
            post.status === 'OPEN'
              ? 'bg-green-50 text-green-700'
              : post.status === 'CANCELLED'
                ? 'bg-neutral-100 text-neutral-500'
                : ''
          }
        >
          {STATUS_LABELS[post.status] ?? post.status}
        </Badge>
      </div>

      <Link href={`/posts/${post.id}`} className="mt-2 block font-medium leading-snug">
        {post.title}
      </Link>

      <p className="mt-1 text-xs text-neutral-500">
        {relativeDayLabel(post.startTime)} · {formatStartTime(post.startTime)} · {post.memberCount}/
        {post.capacity} 人
      </p>

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
