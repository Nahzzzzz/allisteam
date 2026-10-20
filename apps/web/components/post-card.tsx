import Link from 'next/link';
import { PLATFORM_LABELS, type Platform, type PostSummary } from '@allisteam/shared';
import { Badge } from '@/components/ui/badge';
import { formatStartTime, relativeDayLabel } from '@/lib/format';

export function PostCard({ post }: { post: PostSummary }) {
  const remaining = post.capacity - post.memberCount;

  return (
    <Link href={`/posts/${post.id}`} className="block" aria-label={post.title}>
      <article className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-colors hover:border-neutral-300">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Badge className="bg-neutral-900 text-white">{post.game?.name ?? '游戏'}</Badge>
          {post.platform ? (
            <Badge>{PLATFORM_LABELS[post.platform as Platform] ?? post.platform}</Badge>
          ) : null}
          {post.mode ? <Badge>{post.mode}</Badge> : null}
          {post.needVoice ? <Badge className="bg-amber-50 text-amber-700">需开麦</Badge> : null}
        </div>

        <h2 className="line-clamp-2 text-base font-semibold leading-snug">{post.title}</h2>

        {post.rankMin || post.rankMax ? (
          <p className="mt-1 text-xs text-neutral-500">
            段位要求：{post.rankMin ?? '不限'} - {post.rankMax ?? '不限'}
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
          <span>
            {relativeDayLabel(post.startTime)} · {formatStartTime(post.startTime)}
          </span>
          <span className={remaining <= 1 ? 'font-medium text-red-600' : ''}>
            {post.memberCount}/{post.capacity} 人
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2 text-xs text-neutral-500">
          <span>
            {post.author.nickname} · 信誉 {post.author.trustScore}
          </span>
          <span>{remaining > 0 ? `还差 ${remaining} 人` : '已满员'}</span>
        </div>
      </article>
    </Link>
  );
}
