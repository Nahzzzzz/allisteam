'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import type { Paginated, PostSummary } from '@allisteam/shared';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { PostCard } from '@/components/post-card';
import { Button } from '@/components/ui/button';

export interface PostFilters {
  q?: string;
  gameId?: string;
  platform?: string;
  startFrom?: string;
  startTo?: string;
}

function buildPath(filters: PostFilters, cursor: string | undefined): string {
  const params = new URLSearchParams({ limit: '10' });
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value);
    }
  }
  if (cursor) {
    params.set('cursor', cursor);
  }
  return `/posts?${params.toString()}`;
}

export function PostsList({ filters }: { filters: PostFilters }) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.posts(filters as Record<string, string | undefined>),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => apiFetch<Paginated<PostSummary>>(buildPath(filters, pageParam)),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
  });

  const posts = query.data?.pages.flatMap((page) => page.items) ?? [];

  if (query.isPending) {
    return (
      <div className="space-y-3 px-4 py-4">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-36 animate-pulse rounded-xl bg-neutral-100" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return <p className="px-4 py-10 text-center text-sm text-neutral-500">加载失败，请下拉重试</p>;
  }

  if (posts.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-neutral-500">
        <p>还没有符合条件的局</p>
        <p className="mt-2">
          <a href="/posts/new" className="font-medium text-neutral-900 underline">
            发一个自己的局
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      {query.hasNextPage ? (
        <Button
          variant="secondary"
          size="block"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? '加载中…' : '加载更多'}
        </Button>
      ) : (
        <p className="py-2 text-center text-xs text-neutral-400">已经到底了</p>
      )}
    </div>
  );
}
