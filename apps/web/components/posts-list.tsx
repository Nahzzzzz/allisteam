'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { Domain, Paginated, PostSummary } from '@allisteam/shared';
import { apiFetch } from '@/lib/api';
import { DOMAIN_META, domainOf } from '@/lib/domain';
import { queryKeys } from '@/lib/query-keys';
import { AlertIcon, CompassIcon } from '@/components/icons';
import { PostCard } from '@/components/post-card';
import { PostCardSkeleton } from '@/components/post-card-skeleton';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

const PAGE_SIZE = 10;

export interface PostFilters {
  domain?: string;
  q?: string;
  gameId?: string;
  platform?: string;
  city?: string;
  artist?: string;
  seatType?: string;
  destination?: string;
  budgetMax?: string;
  transport?: string;
  startFrom?: string;
  startTo?: string;
}

function buildPath(filters: PostFilters, cursor: string | undefined): string {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
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
  const { data, isPending, isError, refetch, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: queryKeys.posts(filters as Record<string, string | undefined>),
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) => apiFetch<Paginated<PostSummary>>(buildPath(filters, pageParam)),
      getNextPageParam: (lastPage) =>
        lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    });

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 触底自动加载；保留「加载更多」按钮做兜底（键盘用户、IntersectionObserver 不可用时）
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void fetchNextPage();
        }
      },
      { rootMargin: '240px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  if (isPending) {
    return (
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {[0, 1, 2].map((index) => (
          <PostCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<AlertIcon />}
        title="加载失败"
        description="网络或服务异常，稍后再试一次。"
        action={
          <Button variant="secondary" size="sm" onClick={() => void refetch()}>
            重试
          </Button>
        }
      />
    );
  }

  if (posts.length === 0) {
    const domain = domainOf(filters.domain);
    const hint: Record<Domain, string> = {
      GAME: '换个游戏或放宽时间试试，也可以自己开一局等人来。',
      CONCERT: '换个艺人或放宽日期试试，也可以自己发一场找人同行。',
      TRAVEL: '换个目的地或放宽预算试试，也可以自己发起一段行程。',
    };
    return (
      <EmptyState
        icon={<CompassIcon />}
        title="还没有符合条件的局"
        description={hint[domain]}
        action={
          <Link
            href={domain === 'GAME' ? '/posts/new' : `/posts/new?domain=${domain}`}
            className={buttonVariants({ size: 'md' })}
          >
            发一个自己的局
          </Link>
        }
      />
    );
  }

  const domain = domainOf(filters.domain);

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-end justify-between gap-2 border-b-2 border-line pb-2">
        <h2 className="flex items-baseline gap-2 text-[13px] font-bold tracking-tight">
          <span className="size-1.5 translate-y-[-1px] animate-pulse-dot rounded-full bg-lime" />
          正在招募
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            {DOMAIN_META[domain].code}
          </span>
        </h2>
        <span className="font-mono text-[10px] tabular-nums text-ink-faint">
          {posts.length} 个局
        </span>
      </div>

      <div className="grid gap-2.5 md:grid-cols-2 md:gap-3">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      <div ref={sentinelRef} aria-hidden="true" className="h-px" />

      <div className="mt-4 flex justify-center">
        {hasNextPage ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? '加载中…' : '加载更多'}
          </Button>
        ) : (
          <p className="text-[11px] text-ink-faint">已经到底了</p>
        )}
      </div>
    </section>
  );
}
