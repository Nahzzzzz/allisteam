'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  CONCERT_SEAT_LABELS,
  PLATFORM_LABELS,
  TRAVEL_INTENSITY_LABELS,
  TRAVEL_TRANSPORT_LABELS,
  createPostSchema,
  gameModuleOf,
  hikingRoutesMatching,
  type ConcertSeat,
  type Domain,
  type Platform,
  type TravelIntensity,
  type TravelTransport,
} from '@allisteam/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createPost, listGames, listMyGames } from '@/lib/api';
import { DOMAIN_META, DOMAIN_ORDER } from '@/lib/domain';
import { localInputToIso } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const SEATS = Object.keys(CONCERT_SEAT_LABELS) as ConcertSeat[];
const TRANSPORTS = Object.keys(TRAVEL_TRANSPORT_LABELS) as TravelTransport[];
const INTENSITIES = Object.keys(TRAVEL_INTENSITY_LABELS) as TravelIntensity[];

/** 表单值全部用字符串保存，提交前再按领域组装成 zod 输入 */
interface PostFormValues {
  title: string;
  description: string;
  city: string;
  startTimeLocal: string;
  endTimeLocal: string;
  capacity: string;
  // 游戏
  gameId: string;
  platform: Platform;
  mode: string;
  rankMin: string;
  rankMax: string;
  needVoice: boolean;
  // 演唱会
  artist: string;
  tourName: string;
  venue: string;
  seatType: ConcertSeat;
  hasTicket: boolean;
  ticketNote: string;
  // 旅游
  destination: string;
  budgetMin: string;
  budgetMax: string;
  transport: TravelTransport;
  intensity: TravelIntensity;
  shareRoom: boolean;
}

const DEFAULT_VALUES: PostFormValues = {
  title: '',
  description: '',
  city: '',
  startTimeLocal: '',
  endTimeLocal: '',
  capacity: '5',
  gameId: '',
  platform: 'PC',
  mode: '',
  rankMin: '',
  rankMax: '',
  needVoice: true,
  artist: '',
  tourName: '',
  venue: '',
  seatType: 'UNDECIDED',
  hasTicket: true,
  ticketNote: '',
  destination: '',
  budgetMin: '',
  budgetMax: '',
  transport: 'ANY',
  intensity: 'MODERATE',
  shareRoom: false,
};

/** zod 的报错路径 → 表单字段，用来把错误落到具体输入框 */
const FIELD_BY_PATH: Record<string, keyof PostFormValues> = {
  'game.gameId': 'gameId',
  'game.platform': 'platform',
  'game.mode': 'mode',
  'game.rankMin': 'rankMin',
  'game.rankMax': 'rankMax',
  'concert.artist': 'artist',
  'concert.tourName': 'tourName',
  'concert.venue': 'venue',
  'concert.seatType': 'seatType',
  'concert.ticketNote': 'ticketNote',
  'travel.destination': 'destination',
  'travel.budgetMin': 'budgetMin',
  'travel.budgetMax': 'budgetMax',
  'travel.transport': 'transport',
  'travel.intensity': 'intensity',
  endTime: 'endTimeLocal',
};

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

function FieldError({ message }: { message: string | undefined }) {
  if (!message) {
    return null;
  }
  return <p className="mt-1 text-xs text-danger">{message}</p>;
}

export function NewPostForm({
  initialDomain,
  initialDestination,
}: {
  initialDomain: Domain;
  initialDestination?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [domain, setDomain] = useState<Domain>(initialDomain);

  const games = useQuery({
    queryKey: queryKeys.games(),
    queryFn: listGames,
    enabled: domain === 'GAME',
  });
  const myGames = useQuery({
    queryKey: queryKeys.myGames(),
    queryFn: listMyGames,
    enabled: domain === 'GAME',
  });

  const form = useForm<PostFormValues>({
    defaultValues: { ...DEFAULT_VALUES, destination: initialDestination ?? '' },
  });
  const errors = form.formState.errors;
  const meta = DOMAIN_META[domain];

  // 目的地写到「雨崩 / 雨崩村 / 云南雨崩」时都能匹配到攻略，给发布表单一个行前入口
  const destinationValue = form.watch('destination');
  const matchedRoute = hikingRoutesMatching(destinationValue)[0];

  // 游戏模块预设：选不同游戏时换掉默认平台，并清掉上一款游戏的模式 / 段位
  const selectedGameId = form.watch('gameId');
  const selectedGameName = games.data?.find((game) => game.id === selectedGameId)?.name;
  const gameModule = gameModuleOf(selectedGameName);
  const lastGameName = useRef('');

  useEffect(() => {
    if (!selectedGameName || lastGameName.current === selectedGameName) {
      return;
    }
    lastGameName.current = selectedGameName;
    form.setValue('platform', gameModule.defaultPlatform);
    form.setValue('mode', '');
    form.setValue('rankMin', '');
    form.setValue('rankMax', '');
  }, [form, gameModule.defaultPlatform, selectedGameName]);

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

  function selectDomain(next: Domain) {
    if (next === domain) {
      return;
    }
    setDomain(next);
    form.clearErrors();
  }

  const onSubmit = form.handleSubmit((values) => {
    if (!values.startTimeLocal) {
      form.setError('startTimeLocal', { message: '请选择开始时间' });
      toast.error('请选择开始时间');
      return;
    }

    if (domain === 'TRAVEL' && !values.endTimeLocal) {
      form.setError('endTimeLocal', { message: '请选择返程时间' });
      toast.error('请选择返程时间');
      return;
    }

    if (
      values.endTimeLocal &&
      new Date(values.endTimeLocal).getTime() <= new Date(values.startTimeLocal).getTime()
    ) {
      form.setError('endTimeLocal', {
        message: domain === 'TRAVEL' ? '返程时间必须晚于出发时间' : '结束时间必须晚于开始时间',
      });
      toast.error(domain === 'TRAVEL' ? '返程时间必须晚于出发时间' : '结束时间必须晚于开始时间');
      return;
    }

    const common = {
      title: values.title,
      description: values.description,
      city: values.city || undefined,
      startTime: localInputToIso(values.startTimeLocal),
      capacity: Number(values.capacity),
    };

    const payload =
      domain === 'GAME'
        ? {
            domain: 'GAME' as const,
            ...common,
            game: {
              gameId: values.gameId,
              platform: values.platform,
              mode: values.mode || undefined,
              rankMin: values.rankMin || undefined,
              rankMax: values.rankMax || undefined,
              needVoice: values.needVoice,
            },
          }
        : domain === 'CONCERT'
          ? {
              domain: 'CONCERT' as const,
              ...common,
              ...(values.endTimeLocal ? { endTime: localInputToIso(values.endTimeLocal) } : {}),
              concert: {
                artist: values.artist,
                tourName: values.tourName || undefined,
                venue: values.venue || undefined,
                seatType: values.seatType,
                hasTicket: values.hasTicket,
                ticketNote: values.ticketNote || undefined,
              },
            }
          : {
              domain: 'TRAVEL' as const,
              ...common,
              endTime: values.endTimeLocal ? localInputToIso(values.endTimeLocal) : '',
              travel: {
                destination: values.destination,
                budgetMin: values.budgetMin ? Number(values.budgetMin) : undefined,
                budgetMax: values.budgetMax ? Number(values.budgetMax) : undefined,
                transport: values.transport,
                intensity: values.intensity,
                shareRoom: values.shareRoom,
              },
            };

    const parsed = createPostSchema.safeParse(payload);
    if (!parsed.success) {
      let firstMessage = '请检查表单内容';
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        const field = FIELD_BY_PATH[path] ?? (path as keyof PostFormValues);
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

  const needsProfile = domain === 'GAME' && myGames.isSuccess && myGames.data.length === 0;

  return (
    <main className="px-4 pb-24 pt-7 md:max-w-2xl md:px-8 md:pb-12 md:pt-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-faint">
        New Post · 发布
      </p>
      <h1 className="mt-2 text-[28px] font-black tracking-tight">发布一个局</h1>
      <p className="mt-1.5 text-sm text-ink-muted">{meta.publishHint}</p>

      {/* 领域选择 = 撕下哪一张票根 */}
      <div className="mt-4 grid grid-cols-3 gap-1.5">
        {DOMAIN_ORDER.map((item) => {
          const itemMeta = DOMAIN_META[item];
          const active = item === domain;
          return (
            <button
              key={item}
              type="button"
              onClick={() => selectDomain(item)}
              aria-pressed={active}
              className={cn(
                'flex flex-col items-start gap-0.5 rounded-[6px] border px-2.5 py-2 text-left transition-[background-color,border-color,box-shadow]',
                active
                  ? cn(itemMeta.solid, 'border-transparent shadow-press')
                  : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
              )}
            >
              <span className="text-[13px] font-bold">{itemMeta.label}</span>
              <span className="font-mono text-[9px] tracking-[0.1em] opacity-70">
                {itemMeta.code}
              </span>
            </button>
          );
        })}
      </div>

      {needsProfile ? (
        <p className="mt-4 rounded-[8px] border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
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
              placeholder={
                domain === 'GAME'
                  ? '例如：今晚八点无畏契约排位缺一'
                  : domain === 'CONCERT'
                    ? '例如：陈粒上海站内场找同行'
                    : '例如：国庆大理五天找搭子'
              }
              {...form.register('title')}
            />
            <FieldError message={errors.title?.message} />
          </div>

          <div>
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              placeholder={
                domain === 'GAME'
                  ? '段位、玩法、时长、对队友的要求…'
                  : domain === 'CONCERT'
                    ? '座位区域、集合时间、散场后怎么走…'
                    : '路线、节奏、住宿安排、对同行人的期待…'
              }
              {...form.register('description')}
            />
            <FieldError message={errors.description?.message} />
          </div>
        </Card>

        <Card className="space-y-3">
          {domain === 'GAME' ? (
            <>
              <SectionHead index="02" title="游戏信息" hint="游戏、平台与门槛" />
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
                  <FieldError message={errors.gameId?.message} />
                </div>

                <div>
                  <Label htmlFor="platform">平台</Label>
                  <Select id="platform" {...form.register('platform')}>
                    {gameModule.platforms.map((platform) => (
                      <option key={platform} value={platform}>
                        {PLATFORM_LABELS[platform]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {selectedGameName ? (
                <p className="rounded-[8px] border border-dashed border-line px-3 py-2 text-[11px] leading-relaxed text-ink-faint">
                  <span className="font-medium text-ink-muted">{gameModule.tagline}</span>
                  <br />
                  {gameModule.hint}
                </p>
              ) : null}

              <div>
                <Label htmlFor="mode">模式</Label>
                <Input
                  id="mode"
                  list="game-mode-options"
                  placeholder={gameModule.modes[0] ?? '排位 / 休闲'}
                  {...form.register('mode')}
                />
                <datalist id="game-mode-options">
                  {gameModule.modes.map((mode) => (
                    <option key={mode} value={mode} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="rankMin">最低{gameModule.rankLabel}</Label>
                  <Input
                    id="rankMin"
                    list="game-rank-options"
                    placeholder={gameModule.ranks[0] ?? '不限'}
                    {...form.register('rankMin')}
                  />
                </div>
                <div>
                  <Label htmlFor="rankMax">最高{gameModule.rankLabel}</Label>
                  <Input
                    id="rankMax"
                    list="game-rank-options"
                    placeholder={gameModule.ranks.at(-1) ?? '不限'}
                    {...form.register('rankMax')}
                  />
                </div>
                <datalist id="game-rank-options">
                  {gameModule.ranks.map((rank) => (
                    <option key={rank} value={rank} />
                  ))}
                </datalist>
              </div>

              <label className="flex min-h-11 items-center gap-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  className="size-4 accent-accent"
                  {...form.register('needVoice')}
                />
                要求开麦
              </label>
            </>
          ) : null}

          {domain === 'CONCERT' ? (
            <>
              <SectionHead index="02" title="演出信息" hint="艺人、场馆与座位" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="artist">艺人</Label>
                  <Input id="artist" placeholder="陈粒" {...form.register('artist')} />
                  <FieldError message={errors.artist?.message} />
                </div>
                <div>
                  <Label htmlFor="seatType">座位区域</Label>
                  <Select id="seatType" {...form.register('seatType')}>
                    {SEATS.map((seat) => (
                      <option key={seat} value={seat}>
                        {CONCERT_SEAT_LABELS[seat]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="tourName">巡演 / 场次名</Label>
                <Input id="tourName" placeholder="选填，例如 洄游" {...form.register('tourName')} />
              </div>

              <div>
                <Label htmlFor="venue">场馆</Label>
                <Input
                  id="venue"
                  placeholder="选填，例如 梅赛德斯-奔驰文化中心"
                  {...form.register('venue')}
                />
              </div>

              <label className="flex min-h-11 items-center gap-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  className="size-4 accent-accent"
                  {...form.register('hasTicket')}
                />
                票已自备（不勾选表示还没票，只找同行）
              </label>

              <div>
                <Label htmlFor="ticketNote">票务备注</Label>
                <Input
                  id="ticketNote"
                  placeholder="选填，例如 内场 B 区连座两张"
                  {...form.register('ticketNote')}
                />
                <FieldError message={errors.ticketNote?.message} />
              </div>

              <p className="rounded-[8px] border border-dashed border-line px-3 py-2 text-[11px] leading-relaxed text-ink-faint">
                演唱会领域只做「找同行的人」，平台不提供任何票务交易或转售。
              </p>
            </>
          ) : null}

          {domain === 'TRAVEL' ? (
            <>
              <SectionHead index="02" title="行程信息" hint="目的地、预算与节奏" />
              <div>
                <Label htmlFor="destination">目的地</Label>
                <Input id="destination" placeholder="大理" {...form.register('destination')} />
                <FieldError message={errors.destination?.message} />
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px]">
                  <span className="min-w-0 truncate text-ink-faint">
                    {matchedRoute
                      ? `有「${matchedRoute.name}」攻略：${matchedRoute.duration} · ${matchedRoute.distanceKm} km`
                      : '第一次走长线？先把路线和装备看一遍'}
                  </span>
                  <Link
                    href={matchedRoute ? `/travel/hikes/${matchedRoute.slug}` : '/travel/hikes'}
                    className="shrink-0 font-semibold text-tone-3 underline underline-offset-2 transition-colors hover:text-ink"
                  >
                    查看攻略
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="budgetMin">人均预算下限</Label>
                  <Input
                    id="budgetMin"
                    type="number"
                    min={0}
                    step={500}
                    placeholder="选填"
                    {...form.register('budgetMin')}
                  />
                </div>
                <div>
                  <Label htmlFor="budgetMax">人均预算上限</Label>
                  <Input
                    id="budgetMax"
                    type="number"
                    min={0}
                    step={500}
                    placeholder="选填"
                    {...form.register('budgetMax')}
                  />
                  <FieldError message={errors.budgetMax?.message} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="transport">交通方式</Label>
                  <Select id="transport" {...form.register('transport')}>
                    {TRANSPORTS.map((transport) => (
                      <option key={transport} value={transport}>
                        {TRAVEL_TRANSPORT_LABELS[transport]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="intensity">行程强度</Label>
                  <Select id="intensity" {...form.register('intensity')}>
                    {INTENSITIES.map((intensity) => (
                      <option key={intensity} value={intensity}>
                        {TRAVEL_INTENSITY_LABELS[intensity]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <label className="flex min-h-11 items-center gap-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  className="size-4 accent-accent"
                  {...form.register('shareRoom')}
                />
                可以拼房（分摊住宿）
              </label>
            </>
          ) : null}
        </Card>

        <Card className="space-y-3">
          <SectionHead
            index="03"
            title="时间与人数"
            hint={domain === 'TRAVEL' ? '出发与返程' : '什么时候开始'}
          />
          <div className={domain === 'TRAVEL' ? 'grid grid-cols-2 gap-2' : undefined}>
            <div>
              <Label htmlFor="startTimeLocal">
                {domain === 'TRAVEL' ? '出发时间' : domain === 'CONCERT' ? '场次时间' : '开始时间'}
              </Label>
              <Input
                id="startTimeLocal"
                type="datetime-local"
                {...form.register('startTimeLocal')}
              />
              <FieldError message={errors.startTimeLocal?.message} />
            </div>

            {domain === 'TRAVEL' ? (
              <div>
                <Label htmlFor="endTimeLocal">返程时间</Label>
                <Input id="endTimeLocal" type="datetime-local" {...form.register('endTimeLocal')} />
                <FieldError message={errors.endTimeLocal?.message} />
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="capacity">名额</Label>
              <Input
                id="capacity"
                type="number"
                min={2}
                max={20}
                {...form.register('capacity')}
              />
              <FieldError message={errors.capacity?.message} />
            </div>
            <div>
              <Label htmlFor="city">{domain === 'TRAVEL' ? '出发城市' : '城市'}</Label>
              <Input
                id="city"
                placeholder={domain === 'TRAVEL' ? '选填，例如 上海' : '选填'}
                {...form.register('city')}
              />
            </div>
          </div>
        </Card>

        <Button
          type="submit"
          size="block"
          disabled={mutation.isPending || (domain === 'GAME' && games.isPending)}
        >
          {mutation.isPending ? '发布中…' : `发布${meta.label}局`}
        </Button>
      </form>
    </main>
  );
}
