'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  PLATFORM_LABELS,
  gameProfileInputSchema,
  updateProfileSchema,
  type GameProfileInput,
  type MeView,
  type Platform,
  type UpdateProfileInput,
} from '@allisteam/shared';
import { AuthGate } from '@/components/auth-gate';
import { MicIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  addGameProfile,
  getMe,
  listGames,
  listMyGames,
  logout,
  removeGameProfile,
  updateMe,
} from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { queryKeys } from '@/lib/query-keys';
import { toneOf } from '@/lib/tone';
import { cn } from '@/lib/utils';

const PLATFORMS = Object.keys(PLATFORM_LABELS) as Platform[];

const TAB_CLASS =
  'rounded-[6px] border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-line-strong hover:text-ink';

export default function MePage() {
  return (
    <AuthGate>
      <MeContent />
    </AuthGate>
  );
}

function MeContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loggingOut, setLoggingOut] = useState(false);
  const me = useQuery({ queryKey: queryKeys.me(), queryFn: getMe });
  const games = useQuery({ queryKey: queryKeys.games(), queryFn: listGames });
  const myGames = useQuery({
    queryKey: queryKeys.myGames(),
    queryFn: listMyGames,
  });

  async function handleLogout(): Promise<void> {
    setLoggingOut(true);
    await logout();
    queryClient.clear();
    toast.success('已退出登录');
    router.replace('/');
  }

  return (
    <main className="px-4 pb-24 pt-7 md:px-8 md:pb-12 md:pt-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
        My Desk · 我的
      </p>
      <h1 className="mt-2 text-[30px] font-black tracking-tight">我的</h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        补全资料和游戏档案，方便别人判断要不要一起玩。
      </p>

      {me.data ? (
        <div className="relative mt-4 overflow-hidden rounded-[14px] border border-line-strong/60 bg-surface shadow-ticket">
          <div aria-hidden="true" className="color-strip h-1" />

          <div className="paper-print relative px-4 pb-3.5 pt-3">
            <div className="flex items-center justify-between font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-paper-muted">
              <span>Member Card</span>
              <span>{me.data.isAdmin ? 'Staff / Admin' : 'Player / No.001'}</span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <span
                className={cn(
                  'grid size-11 shrink-0 place-items-center rounded-[7px] text-lg font-black',
                  toneOf(me.data.nickname).fill,
                )}
              >
                {me.data.nickname.trim().slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[21px] font-black leading-tight tracking-[-0.01em]">
                  {me.data.nickname}
                </p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-paper-muted">
                  {me.data.email}
                </p>
              </div>
              {me.data.isAdmin ? (
                <span className="shrink-0 -rotate-6 rounded-[3px] border-2 border-signal/80 px-1.5 py-1 font-mono text-[9px] font-bold uppercase leading-none tracking-[0.1em] text-signal">
                  Admin
                </span>
              ) : null}
            </div>
          </div>

          <div className="relative border-t-2 border-dashed border-paper-ink/30 bg-surface">
            <span
              aria-hidden="true"
              className="perforation absolute -left-[7px] -top-[7px] size-3.5 rounded-full"
            />
            <span
              aria-hidden="true"
              className="perforation absolute -right-[7px] -top-[7px] size-3.5 rounded-full"
            />
            <div className="grid grid-cols-3 divide-x divide-dashed divide-line-strong/50">
              <div className="px-3 py-2.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                  信誉
                </p>
                <p className="mt-0.5 flex items-baseline gap-1 font-mono text-[20px] font-black leading-none tabular-nums text-lime">
                  {me.data.trustScore}
                  <span className="text-[10px] font-normal text-ink-faint">/100</span>
                </p>
              </div>
              <div className="px-3 py-2.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                  评价
                </p>
                <p className="mt-0.5 flex items-baseline gap-1 font-mono text-[20px] font-black leading-none tabular-nums text-ice">
                  {me.data.reviewCount}
                  <span className="text-[10px] font-normal text-ink-faint">条</span>
                </p>
              </div>
              <div className="px-3 py-2.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                  档案
                </p>
                <p className="mt-0.5 flex items-baseline gap-1 font-mono text-[20px] font-black leading-none tabular-nums text-accent">
                  {myGames.data?.length ?? 0}
                  <span className="text-[10px] font-normal text-ink-faint">款</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/me/posts" className={TAB_CLASS}>
          我发起的
        </Link>
        <Link href="/me/applications" className={TAB_CLASS}>
          我参与的
        </Link>
        <Link
          href="/posts/new"
          className={cn(
            TAB_CLASS,
            'border-transparent bg-accent text-accent-ink shadow-press hover:bg-accent-highlight',
          )}
        >
          发布新局
        </Link>
        {me.data?.isAdmin ? (
          <Link
            href="/admin/reports"
            className={cn(
              TAB_CLASS,
              'border-violet/30 bg-violet/10 text-violet hover:border-violet/60',
            )}
          >
            举报处理
          </Link>
        ) : null}
      </div>

      <ProfileForm
        me={me.data}
        onSaved={() => void queryClient.invalidateQueries({ queryKey: queryKeys.me() })}
      />

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">游戏档案</h2>
          <span className="text-xs text-ink-faint">{myGames.data?.length ?? 0} 条</span>
        </div>

        {myGames.data?.length === 0 ? (
          <p className="mt-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            还没有游戏档案。至少添加一条，别人才能了解你的段位和平台。
          </p>
        ) : null}

        <div className="mt-3 space-y-2">
          {(myGames.data ?? []).map((profile) => (
            <div
              key={profile.id}
              className="metal-sheen flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 shadow-card"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate text-sm font-semibold">
                  <span
                    className={cn('size-1.5 shrink-0 rounded-full', toneOf(profile.gameName).dot)}
                  />
                  {profile.gameName}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                  <span>{PLATFORM_LABELS[profile.platform as Platform] ?? profile.platform}</span>
                  {profile.rankText ? <span>· {profile.rankText}</span> : null}
                  <span className="inline-flex items-center gap-1">
                    <MicIcon className="size-3" />
                    {profile.voiceOk ? '可开麦' : '不开麦'}
                  </span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void removeGameProfile(profile.id)
                    .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.myGames() }))
                    .catch((error: unknown) =>
                      toast.error(error instanceof Error ? error.message : '删除失败'),
                    )
                }
              >
                删除
              </Button>
            </div>
          ))}
        </div>

        <GameProfileForm
          games={(games.data ?? []).map((game) => ({ id: game.id, name: game.name }))}
          onSaved={() => void queryClient.invalidateQueries({ queryKey: queryKeys.myGames() })}
        />
      </section>

      <Button
        variant="ghost"
        size="block"
        className="mt-6 text-ink-faint hover:text-danger"
        disabled={loggingOut}
        onClick={() => void handleLogout()}
      >
        {loggingOut ? '退出中…' : '退出登录'}
      </Button>
    </main>
  );
}

function ProfileForm({ me, onSaved }: { me: MeView | undefined; onSaved: () => void }) {
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { nickname: '', bio: '', city: '' },
  });

  useEffect(() => {
    if (me) {
      form.reset({ nickname: me.nickname, bio: me.bio ?? '', city: me.city ?? '' });
    }
  }, [me, form]);

  const mutation = useMutation({
    mutationFn: (values: UpdateProfileInput) => {
      const payload: UpdateProfileInput = {
        nickname: values.nickname,
        ...(values.bio ? { bio: values.bio } : {}),
        ...(values.city ? { city: values.city } : {}),
      };
      return updateMe(payload);
    },
    onSuccess: (saved) => {
      toast.success('资料已保存');
      const current = useAuthStore.getState();
      if (current.accessToken) {
        current.updateUser({ id: saved.id, nickname: saved.nickname, email: saved.email });
      }
      onSaved();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card className="mt-4">
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="space-y-3"
        noValidate
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="nickname">昵称</Label>
            <Input id="nickname" {...form.register('nickname')} />
            {form.formState.errors.nickname ? (
              <p className="mt-1 text-xs text-danger">{form.formState.errors.nickname.message}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="city">城市</Label>
            <Input id="city" placeholder="例如：成都" {...form.register('city')} />
          </div>
        </div>

        <div>
          <Label htmlFor="bio">简介</Label>
          <Textarea id="bio" placeholder="说说你的游戏时间和习惯" {...form.register('bio')} />
        </div>

        <Button type="submit" size="block" disabled={mutation.isPending}>
          {mutation.isPending ? '保存中…' : '保存资料'}
        </Button>
      </form>
    </Card>
  );
}

function GameProfileForm({
  games,
  onSaved,
}: {
  games: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const form = useForm<GameProfileInput>({
    resolver: zodResolver(gameProfileInputSchema),
    defaultValues: { gameId: '', platform: 'PC', rankText: '', voiceOk: true },
  });

  useEffect(() => {
    if (!form.getValues('gameId') && games.length > 0) {
      form.setValue('gameId', games[0]!.id);
    }
  }, [games, form]);

  const mutation = useMutation({
    mutationFn: (values: GameProfileInput) => {
      const payload: GameProfileInput = {
        gameId: values.gameId,
        platform: values.platform,
        ...(values.rankText ? { rankText: values.rankText } : {}),
        voiceOk: values.voiceOk,
      };
      return addGameProfile(payload);
    },
    onSuccess: () => {
      toast.success('游戏档案已添加');
      form.reset({ gameId: form.getValues('gameId'), platform: 'PC', rankText: '', voiceOk: true });
      onSaved();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      className="mt-3 space-y-3 rounded-2xl border border-dashed border-line-strong p-3.5"
      noValidate
    >
      <p className="text-sm font-semibold">添加游戏档案</p>

      <div className="grid grid-cols-2 gap-2">
        <Select aria-label="游戏" {...form.register('gameId')}>
          {games.map((game) => (
            <option key={game.id} value={game.id}>
              {game.name}
            </option>
          ))}
        </Select>

        <Select aria-label="平台" {...form.register('platform')}>
          {PLATFORMS.map((platform) => (
            <option key={platform} value={platform}>
              {PLATFORM_LABELS[platform]}
            </option>
          ))}
        </Select>
      </div>

      <Input placeholder="段位，例如：铂金" {...form.register('rankText')} />

      <label className="flex min-h-11 items-center gap-2 text-xs text-ink-muted">
        <input type="checkbox" className="size-4 accent-accent" {...form.register('voiceOk')} />
        可以开麦
      </label>

      <Button
        type="submit"
        variant="secondary"
        size="block"
        disabled={mutation.isPending || games.length === 0}
      >
        {mutation.isPending ? '添加中…' : '添加'}
      </Button>
    </form>
  );
}
