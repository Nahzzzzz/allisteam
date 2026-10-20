'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PLATFORM_LABELS, type Platform } from '@allisteam/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getPost } from '@/lib/api';
import { formatStartTime, relativeDayLabel } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

const STATUS_LABELS: Record<string, string> = {
  OPEN: '招募中',
  FULL: '已满员',
  CLOSED: '已结束',
  CANCELLED: '已取消',
};

export function PostDetailView({ postId }: { postId: string }) {
  const query = useQuery({
    queryKey: queryKeys.post(postId),
    queryFn: () => getPost(postId),
  });

  if (query.isPending) {
    return <p className="px-4 py-16 text-center text-sm text-neutral-500">加载中…</p>;
  }

  if (query.isError) {
    return (
      <div className="px-4 py-16 text-center text-sm text-neutral-500">
        <p>这个局不存在，或者已经被取消。</p>
        <p className="mt-3">
          <Link href="/" className="font-medium text-neutral-900 underline">
            回首页看看别的局
          </Link>
        </p>
      </div>
    );
  }

  const post = query.data;
  const remaining = post.capacity - post.memberCount;

  return (
    <main className="px-4 py-6">
      <div className="flex items-center gap-2">
        <Badge className="bg-neutral-900 text-white">{post.game?.name ?? '游戏局'}</Badge>
        <Badge>{STATUS_LABELS[post.status] ?? post.status}</Badge>
        {post.platform ? (
          <Badge>{PLATFORM_LABELS[post.platform as Platform] ?? post.platform}</Badge>
        ) : null}
        {post.needVoice ? <Badge className="bg-amber-50 text-amber-700">需开麦</Badge> : null}
      </div>

      <h1 className="mt-3 text-xl font-semibold leading-snug">{post.title}</h1>

      <p className="mt-2 text-sm text-neutral-500">
        {relativeDayLabel(post.startTime)} · {formatStartTime(post.startTime)}
        {post.city ? ` · ${post.city}` : ''}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <Card>
          <p className="text-xs text-neutral-500">名额</p>
          <p className="mt-1 font-semibold">
            {post.memberCount}/{post.capacity} 人
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {remaining > 0 ? `还差 ${remaining} 人` : '已满员'}
          </p>
        </Card>

        <Card>
          <p className="text-xs text-neutral-500">发起人</p>
          <p className="mt-1 font-semibold">{post.author.nickname}</p>
          <p className="mt-1 text-xs text-neutral-500">
            信誉 {post.author.trustScore} · 评价 {post.author.reviewCount}
          </p>
        </Card>
      </div>

      <section className="mt-6">
        <h2 className="text-base font-semibold">说明</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
          {post.description}
        </p>
      </section>

      {post.rankMin || post.rankMax ? (
        <section className="mt-6">
          <h2 className="text-base font-semibold">段位要求</h2>
          <p className="mt-2 text-sm text-neutral-700">
            {post.rankMin ?? '不限'} - {post.rankMax ?? '不限'}
          </p>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-base font-semibold">成员</h2>
        <ul className="mt-2 space-y-1 text-sm text-neutral-700">
          {post.members.map((member) => (
            <li key={member.userId} className="flex items-center justify-between">
              <span>
                {member.nickname}
                {member.role === 'HOST' ? (
                  <Badge className="ml-2 bg-neutral-900 text-white">发起人</Badge>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8 space-y-2">
        <Button size="block" disabled>
          报名功能将在下一阶段开放
        </Button>
        {post.isAuthor ? (
          <Link
            href="/me/posts"
            className="block text-center text-xs font-medium text-neutral-600 underline"
          >
            管理我发起的局
          </Link>
        ) : null}
      </div>
    </main>
  );
}
