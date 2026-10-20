'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { PLATFORM_LABELS, createPostSchema, type Platform } from '@allisteam/shared';
import { AuthGate } from '@/components/auth-gate';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createPost, listGames, listMyGames } from '@/lib/api';
import { localInputToIso } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

const PLATFORMS = Object.keys(PLATFORM_LABELS) as Platform[];

interface PostFormValues {
  title: string;
  description: string;
  city: string;
  startTimeLocal: string;
  capacity: number;
  gameId: string;
  platform: Platform;
  mode: string;
  rankMin: string;
  rankMax: string;
  needVoice: boolean;
}

function SectionHead({ index, title, hint }: { index: string; title: string; hint: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-dashed border-line pb-2">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <span className="font-mono text-[10px] tracking-[0.18em] text-accent">{index}</span>
        {title}
      </p>
      <span className="text-[10px] text-ink-faint">{hint}</span>
    </div>
  );
}

export default function NewPostPage() {
  return (
    <AuthGate>
      <NewPostForm />
    </AuthGate>
  );
}

function NewPostForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const games = useQuery({ queryKey: queryKeys.games(), queryFn: listGames });
  const myGames = useQuery({ queryKey: queryKeys.myGames(), queryFn: listMyGames });

  const form = useForm<PostFormValues>({
    defaultValues: {
      title: '',
      description: '',
      city: '',
      startTimeLocal: '',
      capacity: 5,
      gameId: '',
      platform: 'PC',
      mode: '',
      rankMin: '',
      rankMax: '',
      needVoice: true,
    },
  });

  const mutation = useMutation({
    mutationFn: createPost,
    onSuccess: (post) => {
      toast.success('局已发布');
      void queryClient.invalidateQueries({ queryKey: ['posts'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myPosts() });
      router.push(`/posts/${post.id}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const onSubmit = form.handleSubmit((values) => {
    // 浏览器 datetime-local 不带时区，提交前统一转成 UTC ISO
    const startTime = values.startTimeLocal ? localInputToIso(values.startTimeLocal) : '';

    const parsed = createPostSchema.safeParse({
      domain: 'GAME',
      title: values.title,
      description: values.description,
      city: values.city || undefined,
      startTime,
      capacity: values.capacity,
      game: {
        gameId: values.gameId,
        platform: values.platform,
        mode: values.mode || undefined,
        rankMin: values.rankMin || undefined,
        rankMax: values.rankMax || undefined,
        needVoice: values.needVoice,
      },
    });

    if (!parsed.success) {
      let firstMessage = '请检查表单内容';
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        const field = path.startsWith('game.')
          ? (path.slice('game.'.length) as keyof PostFormValues)
          : (path as keyof PostFormValues);
        if (field in form.getValues()) {
          form.setError(field, { message: issue.message });
        }
        if (firstMessage === '请检查表单内容') {
          firstMessage = issue.message;
        }
      }
      toast.error(firstMessage);
      return;
    }

    mutation.mutate(parsed.data);
  });

  const needsProfile = myGames.isSuccess && myGames.data.length === 0;

  return (
    <main className="px-4 pb-24 pt-7 md:max-w-2xl md:px-8 md:pb-12 md:pt-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
        New Post · 发布
      </p>
      <h1 className="mt-2 text-[28px] font-black tracking-tight">发布一个局</h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        写清时间、游戏和条件，别人一眼就能判断合不合适。
      </p>

      {needsProfile ? (
        <p className="mt-4 rounded-xl border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          还没有游戏档案，
          <Link href="/me" className="font-medium underline">
            先去补一条
          </Link>
          ，别人更容易通过你的报名。
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-5 space-y-3" noValidate>
        <Card className="space-y-3">
          <SectionHead index="01" title="基本信息" hint="标题与描述" />
          <div>
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              placeholder="例如：今晚八点无畏契约排位缺一"
              {...form.register('title')}
            />
            {form.formState.errors.title ? (
              <p className="mt-1 text-xs text-danger">{form.formState.errors.title.message}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              placeholder="段位、玩法、时长、对队友的要求…"
              {...form.register('description')}
            />
            {form.formState.errors.description ? (
              <p className="mt-1 text-xs text-danger">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="space-y-3">
          <SectionHead index="02" title="局的信息" hint="游戏、平台与门槛" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="gameId">游戏</Label>
              <Select id="gameId" {...form.register('gameId')}>
                <option value="">选择游戏</option>
                {(games.data ?? []).map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.name}
                  </option>
                ))}
              </Select>
              {form.formState.errors.gameId ? (
                <p className="mt-1 text-xs text-danger">{form.formState.errors.gameId.message}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="platform">平台</Label>
              <Select id="platform" {...form.register('platform')}>
                {PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>
                    {PLATFORM_LABELS[platform]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="mode">模式</Label>
              <Input id="mode" placeholder="排位 / 休闲" {...form.register('mode')} />
            </div>

            <div>
              <Label htmlFor="capacity">名额</Label>
              <Input
                id="capacity"
                type="number"
                min={2}
                max={20}
                {...form.register('capacity', { valueAsNumber: true })}
              />
              {form.formState.errors.capacity ? (
                <p className="mt-1 text-xs text-danger">{form.formState.errors.capacity.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="rankMin">最低段位</Label>
              <Input id="rankMin" placeholder="不限" {...form.register('rankMin')} />
            </div>
            <div>
              <Label htmlFor="rankMax">最高段位</Label>
              <Input id="rankMax" placeholder="不限" {...form.register('rankMax')} />
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <SectionHead index="03" title="时间与地点" hint="什么时候开" />
          <div>
            <Label htmlFor="startTimeLocal">开始时间</Label>
            <Input id="startTimeLocal" type="datetime-local" {...form.register('startTimeLocal')} />
            {form.formState.errors.startTimeLocal ? (
              <p className="mt-1 text-xs text-danger">
                {form.formState.errors.startTimeLocal.message}
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="city">城市</Label>
            <Input id="city" placeholder="选填，线下见面时有用" {...form.register('city')} />
          </div>

          <label className="flex min-h-11 items-center gap-2 text-xs text-ink-muted">
            <input
              type="checkbox"
              className="size-4 accent-accent"
              {...form.register('needVoice')}
            />
            要求开麦
          </label>
        </Card>

        <Button type="submit" size="block" disabled={mutation.isPending || games.isPending}>
          {mutation.isPending ? '发布中…' : '发布'}
        </Button>
      </form>
    </main>
  );
}
