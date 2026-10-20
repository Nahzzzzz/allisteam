'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PLATFORM_LABELS,
  POST_STATUS_LABELS,
  type Platform,
  type PostStatus,
} from '@allisteam/shared';
import { ApplicationActions } from '@/components/application-actions';
import { HostApplications } from '@/components/host-applications';
import { ReportDialog } from '@/components/report-dialog';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MicIcon,
  StarIcon,
  UsersIcon,
} from '@/components/icons';
import { getPost } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { formatPostTime } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { statusTone, toneOf } from '@/lib/tone';
import { cn } from '@/lib/utils';

function initialOf(nickname: string): string {
  return nickname.trim().slice(0, 1).toUpperCase() || '?';
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
      <span className="h-3 w-0.5 rounded-full bg-accent" />
      {children}
    </h2>
  );
}

/** 详情页从列表进来，给一个明确的返回口，避免只能点底栏回首页 */
function BackBar() {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-20 border-b border-line/80 bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-12 w-full max-w-3xl items-center px-4 md:px-8">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
            } else {
              router.push('/');
            }
          }}
          className="inline-flex h-11 items-center gap-1 rounded-lg pr-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeftIcon className="size-5" />
          返回
        </button>
      </div>
    </div>
  );
}

export function PostDetailView({ postId }: { postId: string }) {
  // 详情里的 isAuthor / 我的报名状态依赖登录态，等 SessionBootstrap 恢复完会话再请求，
  // 否则会先用匿名身份拿到一份「我不是发起人」的数据
  const hydrated = useAuthStore((state) => state.hydrated);
  const myId = useAuthStore((state) => state.user?.id);
  const query = useQuery({
    queryKey: queryKeys.post(postId),
    queryFn: () => getPost(postId),
    enabled: hydrated,
  });

  if (query.isPending) {
    return (
      <main className="pb-24 md:pb-12">
        <BackBar />
        <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-6 md:px-8">
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      </main>
    );
  }

  if (query.isError) {
    return (
      <main className="pb-24 md:pb-12">
        <BackBar />
        <div className="mx-auto w-full max-w-3xl">
          <EmptyState
            title="这个局不存在，或者已经被取消。"
            description="它可能已经结束，或者被发起人删除了。"
            action={
              <Link href="/" className={buttonVariants({ variant: 'secondary', size: 'md' })}>
                回首页看看别的局
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  const post = query.data;
  const remaining = post.capacity - post.memberCount;
  const filled = post.capacity > 0 ? Math.min(1, post.memberCount / post.capacity) : 0;
  const full = remaining <= 0;
  const urgent = !full && remaining <= 1;
  const gameTone = toneOf(post.game?.name ?? '游戏局');
  const authorTone = toneOf(post.author.nickname);
  const toneClass = full ? 'text-ink-faint' : urgent ? 'text-amber' : 'text-lime';
  const barClass = full ? 'bg-ink-faint/40' : urgent ? 'bg-amber' : 'bg-lime';
  const isMember = post.isAuthor || post.members.some((member) => member.userId === myId);

  return (
    <main className="pb-24 md:pb-12">
      <BackBar />
      <div className="mx-auto w-full max-w-3xl px-4 pt-4 md:px-8 md:pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-[3px] px-2 py-1 text-[10px] font-bold',
                gameTone.fill,
              )}
            >
              <span className={cn('size-1.5 rounded-full', gameTone.dot)} />
              {post.game?.name ?? '游戏局'}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-[3px] border px-2 py-1 text-[10px] font-bold',
                statusTone(post.status),
              )}
            >
              {POST_STATUS_LABELS[post.status as PostStatus] ?? post.status}
            </span>
            {post.platform ? (
              <Badge variant="outline">
                {PLATFORM_LABELS[post.platform as Platform] ?? post.platform}
              </Badge>
            ) : null}
            {post.needVoice ? (
              <Badge className="border-ice/30 bg-ice/10 text-ice">
                <MicIcon className="size-3" />
                需开麦
              </Badge>
            ) : null}
          </div>
          {post.isAuthor ? null : <ReportDialog targetType="POST" targetId={post.id} />}
        </div>

        <h1 className="mt-3 text-[25px] font-black leading-snug tracking-[-0.01em]">{post.title}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <ClockIcon className="size-4" />
            {formatPostTime(post.startTime)}
          </span>
          {post.city ? <span>· {post.city}</span> : null}
        </div>

        <Card className="mt-5 bg-stage">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-ink-faint">名额</p>
              <p className="mt-1 flex items-baseline gap-0.5 font-mono text-2xl font-semibold leading-none tabular-nums">
                {post.memberCount}
                <span className="text-sm font-normal text-ink-faint">/{post.capacity}</span>
              </p>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <span
                  className={cn('block h-full rounded-full', barClass)}
                  style={{ width: `${Math.round(filled * 100)}%` }}
                />
              </div>
              <p className={cn('mt-1.5 text-xs font-medium', toneClass)}>
                {remaining > 0 ? `还差 ${remaining} 人` : '已满员'}
              </p>
            </div>

            <div>
              <p className="text-[11px] text-ink-faint">发起人</p>
              <Link
                href={`/users/${post.author.id}`}
                className="mt-1 flex items-center gap-2 text-sm font-semibold transition-colors hover:text-accent"
              >
                <span
                  className={cn(
                    'grid size-7 shrink-0 place-items-center rounded-[4px] text-[11px] font-black',
                    authorTone.fill,
                  )}
                >
                  {initialOf(post.author.nickname)}
                </span>
                <span className="truncate">{post.author.nickname}</span>
              </Link>
              <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-ink-muted">
                <StarIcon className="size-3 text-amber/80" />
                {post.author.trustScore} · 评价 {post.author.reviewCount}
              </p>
            </div>
          </div>
        </Card>

        <section className="mt-6">
          <SectionLabel>说明</SectionLabel>
          <p className="mt-2 whitespace-pre-wrap border-l-2 border-accent/30 pl-3 text-sm leading-relaxed text-ink/90">
            {post.description}
          </p>
        </section>

        {post.rankMin || post.rankMax ? (
          <section className="mt-6">
            <SectionLabel>段位要求</SectionLabel>
            <p className="mt-2 text-sm text-ink/90">
              {post.rankMin ?? '不限'} - {post.rankMax ?? '不限'}
            </p>
          </section>
        ) : null}

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <SectionLabel>成员</SectionLabel>
            <span className="text-xs text-ink-faint">
              {post.memberCount}/{post.capacity}
            </span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {post.members.map((member) => (
              <li key={member.userId}>
                <Link
                  href={`/users/${member.userId}`}
                  className="metal-sheen flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2.5 shadow-card transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-raised"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        'grid size-7 shrink-0 place-items-center rounded-md border text-[11px] font-bold',
                        toneOf(member.nickname).avatar,
                      )}
                    >
                      {initialOf(member.nickname)}
                    </span>
                    <span className="truncate">{member.nickname}</span>
                    {member.role === 'HOST' ? (
                      <Badge className="border-lime/30 bg-lime/10 text-lime">发起人</Badge>
                    ) : null}
                  </span>
                  <ChevronRightIcon className="size-4 text-ink-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {isMember ? (
          <section className="mt-6 space-y-2">
            {post.status === 'CANCELLED' ? (
              <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-center text-sm text-ink-muted">
                发起人取消了这个局，聊天已关闭。
              </div>
            ) : (
              <>
                <Link
                  href={`/posts/${post.id}/chat`}
                  className={cn(buttonVariants({ size: 'block' }), 'gap-2')}
                >
                  <UsersIcon className="size-4" />
                  进入局内聊天
                </Link>
                <p className="text-center text-xs text-ink-faint">
                  成团后在这里对齐时间、语音和房间号，不用交换微信。
                </p>
              </>
            )}

            {post.status === 'CLOSED' ? (
              <Link
                href={`/posts/${post.id}/reviews`}
                className={cn(
                  buttonVariants({ size: 'block', variant: 'secondary' }),
                  'border-warning/40 text-warning',
                )}
              >
                去评价队友
              </Link>
            ) : null}
          </section>
        ) : null}

        {post.isAuthor ? (
          <section className="mt-8">
            <HostApplications postId={post.id} postStatus={post.status} />
          </section>
        ) : null}

        <div className="mt-7 space-y-3">
          <ApplicationActions post={post} />
          {post.isAuthor ? (
            <Link
              href="/me/posts"
              className="block text-center text-xs font-medium text-ink-muted underline underline-offset-4 hover:text-ink"
            >
              管理我发起的局
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
