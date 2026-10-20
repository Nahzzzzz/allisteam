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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listMyApplications } from '@/lib/api';
import { formatStartTime, relativeDayLabel } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

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
    <main className="px-4 py-6">
      <h1 className="text-xl font-semibold">我参与的</h1>
      <p className="mt-1 text-xs text-neutral-500">已经通过审批、和你一起玩的局。</p>

      <div className="mt-3 flex gap-2 text-xs">
        <Link
          href="/me/posts"
          className="rounded-lg bg-neutral-100 px-3 py-2 font-medium text-neutral-700"
        >
          我发起的
        </Link>
        <span className="rounded-lg bg-neutral-900 px-3 py-2 font-medium text-white">我参与的</span>
      </div>

      {query.isPending ? (
        <p className="py-10 text-center text-sm text-neutral-500">加载中…</p>
      ) : null}

      {query.isError ? (
        <p className="py-10 text-center text-sm text-neutral-500">加载失败，请稍后重试</p>
      ) : null}

      {!query.isPending && !query.isError && posts.length === 0 ? (
        <div className="py-12 text-center text-sm text-neutral-500">
          <p>还没有加入任何局</p>
          <p className="mt-2">
            <Link href="/" className="font-medium text-neutral-900 underline">
              去首页看看
            </Link>
          </p>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
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
          {POST_STATUS_LABELS[post.status as PostStatus] ?? post.status}
        </Badge>
        <Badge className="bg-emerald-50 text-emerald-700">
          {APPLY_STATUS_LABELS[post.applicationStatus] ?? post.applicationStatus}
        </Badge>
      </div>

      <Link href={`/posts/${post.id}`} className="mt-2 block font-medium leading-snug">
        {post.title}
      </Link>

      <p className="mt-1 text-xs text-neutral-500">
        {relativeDayLabel(post.startTime)} · {formatStartTime(post.startTime)} · {post.memberCount}/
        {post.capacity} 人
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/posts/${post.id}/chat`}
          className="inline-block rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white"
        >
          局内聊天
        </Link>
        {post.status === 'CLOSED' ? (
          <Link
            href={`/posts/${post.id}/reviews`}
            className="inline-block rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
          >
            去评价队友
          </Link>
        ) : null}
      </div>
    </div>
  );
}
