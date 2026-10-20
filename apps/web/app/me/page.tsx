'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect } from 'react';
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
  removeGameProfile,
  updateMe,
} from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { queryKeys } from '@/lib/query-keys';

const PLATFORMS = Object.keys(PLATFORM_LABELS) as Platform[];

export default function MePage() {
  return (
    <AuthGate>
      <MeContent />
    </AuthGate>
  );
}

function MeContent() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: queryKeys.me(), queryFn: getMe });
  const games = useQuery({ queryKey: queryKeys.games(), queryFn: listGames });
  const myGames = useQuery({
    queryKey: queryKeys.myGames(),
    queryFn: listMyGames,
  });

  return (
    <main className="px-4 py-6">
      <h1 className="text-xl font-semibold">我的</h1>
      <p className="mt-1 text-xs text-neutral-500">
        补全资料和游戏档案，方便别人判断要不要一起玩。
      </p>

      <div className="mt-3 flex gap-2 text-xs">
        <Link
          href="/me/posts"
          className="rounded-lg bg-neutral-100 px-3 py-2 font-medium text-neutral-700"
        >
          我发起的
        </Link>
        <Link
          href="/posts/new"
          className="rounded-lg bg-neutral-100 px-3 py-2 font-medium text-neutral-700"
        >
          发布新局
        </Link>
      </div>

      <ProfileForm
        me={me.data}
        onSaved={() => void queryClient.invalidateQueries({ queryKey: queryKeys.me() })}
      />

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold">游戏档案</h2>
          <span className="text-xs text-neutral-500">{myGames.data?.length ?? 0} 条</span>
        </div>

        {myGames.data?.length === 0 ? (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            还没有游戏档案。至少添加一条，别人才能了解你的段位和平台。
          </p>
        ) : null}

        <div className="mt-3 space-y-2">
          {(myGames.data ?? []).map((profile) => (
            <div
              key={profile.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{profile.gameName}</p>
                <p className="text-xs text-neutral-500">
                  {PLATFORM_LABELS[profile.platform as Platform] ?? profile.platform}
                  {profile.rankText ? ` · ${profile.rankText}` : ''}
                  {profile.voiceOk ? ' · 可开麦' : ' · 不开麦'}
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
        <div>
          <Label htmlFor="nickname">昵称</Label>
          <Input id="nickname" {...form.register('nickname')} />
          {form.formState.errors.nickname ? (
            <p className="mt-1 text-xs text-red-600">{form.formState.errors.nickname.message}</p>
          ) : null}
        </div>

        <div>
          <Label htmlFor="city">城市</Label>
          <Input id="city" placeholder="例如：成都" {...form.register('city')} />
        </div>

        <div>
          <Label htmlFor="bio">简介</Label>
          <Textarea id="bio" placeholder="说说你的游戏时间和习惯" {...form.register('bio')} />
        </div>

        <div className="flex items-center gap-4 text-xs text-neutral-500">
          <span>邮箱：{me?.email ?? '—'}</span>
          <span>信誉分：{me?.trustScore ?? '—'}</span>
          <span>评价：{me?.reviewCount ?? 0}</span>
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
      className="mt-4 space-y-3 rounded-xl border border-dashed border-neutral-300 p-3"
      noValidate
    >
      <p className="text-sm font-medium">添加游戏档案</p>

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

      <label className="flex items-center gap-2 text-xs text-neutral-600">
        <input type="checkbox" {...form.register('voiceOk')} />
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
