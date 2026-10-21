'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  CONCERT_SEAT_LABELS,
  PLATFORM_LABELS,
  TRAVEL_TRANSPORT_LABELS,
  type ConcertSeat,
  type Domain,
  type GameView,
  type Platform,
  type TravelTransport,
} from '@allisteam/shared';
import { apiFetch } from '@/lib/api';
import { DOMAIN_META } from '@/lib/domain';
import { queryKeys } from '@/lib/query-keys';
import { toneOf } from '@/lib/tone';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, CloseIcon, SearchIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const PLATFORMS = Object.keys(PLATFORM_LABELS) as Platform[];
const SEATS = Object.keys(CONCERT_SEAT_LABELS) as ConcertSeat[];
const TRANSPORTS = Object.keys(TRAVEL_TRANSPORT_LABELS) as TravelTransport[];
const BUDGET_PRESETS = [2000, 5000, 10000];

export interface HomeFilterValues {
  q: string;
  gameId: string;
  platform: string;
  city: string;
  artist: string;
  seatType: string;
  destination: string;
  budgetMax: string;
  transport: string;
  startFrom: string;
  startTo: string;
}

type FilterKey = keyof HomeFilterValues;

interface Chip {
  key: FilterKey;
  label: string;
}

const SEARCH_FIELD: Record<Domain, FilterKey> = {
  GAME: 'q',
  CONCERT: 'artist',
  TRAVEL: 'destination',
};

const SEARCH_PLACEHOLDER: Record<Domain, string> = {
  GAME: '搜局名、段位、平台…',
  CONCERT: '搜艺人，例如 陈粒',
  TRAVEL: '搜目的地，例如 大理',
};

const SEARCH_LABEL: Record<Domain, string> = {
  GAME: '搜索局',
  CONCERT: '搜索艺人',
  TRAVEL: '搜索目的地',
};

export function HomeFilters({ domain, initial }: { domain: Domain; initial: HomeFilterValues }) {
  const [expanded, setExpanded] = useState(
    Boolean(
      initial.gameId ||
        initial.platform ||
        initial.city ||
        initial.seatType ||
        initial.budgetMax ||
        initial.transport ||
        initial.startFrom ||
        initial.startTo,
    ),
  );

  const games = useQuery({
    queryKey: queryKeys.games(),
    queryFn: () => apiFetch<GameView[]>('/games'),
    enabled: domain === 'GAME',
  });

  const searchField = SEARCH_FIELD[domain];
  const meta = DOMAIN_META[domain];

  const gameName = games.data?.find((game) => game.id === initial.gameId)?.name ?? '指定游戏';
  const extraCount = [
    initial.gameId,
    initial.platform,
    initial.city,
    initial.seatType,
    initial.budgetMax,
    initial.transport,
    initial.startFrom,
    initial.startTo,
  ].filter(Boolean).length;

  const chips: Chip[] = [];
  if (initial.q) chips.push({ key: 'q', label: `“${initial.q}”` });
  if (initial.gameId) chips.push({ key: 'gameId', label: gameName });
  if (initial.platform) {
    chips.push({
      key: 'platform',
      label: PLATFORM_LABELS[initial.platform as Platform] ?? initial.platform,
    });
  }
  if (initial.city) chips.push({ key: 'city', label: `城市：${initial.city}` });
  if (initial.artist) chips.push({ key: 'artist', label: `艺人：${initial.artist}` });
  if (initial.seatType) {
    chips.push({
      key: 'seatType',
      label: CONCERT_SEAT_LABELS[initial.seatType as ConcertSeat] ?? initial.seatType,
    });
  }
  if (initial.destination) chips.push({ key: 'destination', label: `目的地：${initial.destination}` });
  if (initial.budgetMax) {
    chips.push({
      key: 'budgetMax',
      label: `预算 ≤ ¥${Number(initial.budgetMax).toLocaleString('en-US')}`,
    });
  }
  if (initial.transport) {
    chips.push({
      key: 'transport',
      label: TRAVEL_TRANSPORT_LABELS[initial.transport as TravelTransport] ?? initial.transport,
    });
  }
  if (initial.startFrom) chips.push({ key: 'startFrom', label: `${initial.startFrom} 起` });
  if (initial.startTo) chips.push({ key: 'startTo', label: `至 ${initial.startTo}` });

  /** 换掉一个条件，其余原样带上；value 为空就表示移除该条件 */
  function hrefWith(key: FilterKey, value: string): string {
    const params = new URLSearchParams();
    if (domain !== 'GAME') {
      params.set('domain', domain);
    }
    for (const [name, current] of Object.entries(initial)) {
      if (current && name !== key) {
        params.set(name, current);
      }
    }
    if (value) {
      params.set(key, value);
    }
    const query = params.toString();
    return query ? `/?${query}` : '/';
  }

  // 横向滚动列出全部游戏，守望先锋 / 第五人格 / Steam 小游戏等新增模块也能直接点
  const quickGames = games.data ?? [];

  return (
    <form action="/" method="get" className="mt-3">
      <input type="hidden" name="domain" value={domain} />

      <div className="overflow-hidden rounded-[12px] border border-line bg-surface shadow-card">
        {/* 票据抬头：左边用途，右边当前生效的条件数量 */}
        <div className="flex items-center justify-between border-b border-line bg-surface-2/50 px-3 py-1.5">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ink-faint">
            Filter / {meta.label}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
            {extraCount > 0 ? `${extraCount} 项已选` : '全部局'}
          </span>
        </div>

        <div className="p-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              name={searchField}
              defaultValue={initial[searchField]}
              placeholder={SEARCH_PLACEHOLDER[domain]}
              aria-label={SEARCH_LABEL[domain]}
              className="h-12 rounded-[8px] border-line-strong/70 bg-canvas pl-9 text-[13px]"
            />
          </div>

          {domain === 'GAME' && quickGames.length > 0 ? (
            <div className="-mx-3 mt-2.5 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {quickGames.map((game) => {
                const tone = toneOf(game.name);
                const active = initial.gameId === game.id;
                return (
                  <Link
                    key={game.id}
                    href={hrefWith('gameId', active ? '' : game.id)}
                    aria-pressed={active}
                    className={cn(
                      'shrink-0 rounded-[4px] px-2 py-1 text-[11px] font-semibold transition-colors',
                      active
                        ? cn(tone.fill, 'shadow-card')
                        : cn('border', tone.chip, 'hover:brightness-125'),
                    )}
                  >
                    {game.name}
                  </Link>
                );
              })}
            </div>
          ) : null}

          {domain === 'CONCERT' ? (
            <div className="-mx-3 mt-2.5 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {SEATS.map((seat) => {
                const active = initial.seatType === seat;
                return (
                  <ChipLink
                    key={seat}
                    href={hrefWith('seatType', active ? '' : seat)}
                    active={active}
                    domain={domain}
                  >
                    {CONCERT_SEAT_LABELS[seat]}
                  </ChipLink>
                );
              })}
            </div>
          ) : null}

          {domain === 'TRAVEL' ? (
            <div className="-mx-3 mt-2.5 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {TRANSPORTS.map((transport) => {
                const active = initial.transport === transport;
                return (
                  <ChipLink
                    key={transport}
                    href={hrefWith('transport', active ? '' : transport)}
                    active={active}
                    domain={domain}
                  >
                    {TRAVEL_TRANSPORT_LABELS[transport]}
                  </ChipLink>
                );
              })}
              {BUDGET_PRESETS.map((preset) => {
                const active = initial.budgetMax === String(preset);
                return (
                  <ChipLink
                    key={preset}
                    href={hrefWith('budgetMax', active ? '' : String(preset))}
                    active={active}
                    domain={domain}
                  >
                    ≤{(preset / 1000).toFixed(0)}k
                  </ChipLink>
                );
              })}
            </div>
          ) : null}

          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-11 flex-1 justify-between rounded-[8px] border-dashed text-[13px]"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
              aria-controls="home-extra-filters"
            >
              <span className="inline-flex items-center gap-2">
                更多条件
                {extraCount > 0 ? (
                  <span className="grid size-[18px] place-items-center rounded-[3px] bg-accent font-mono text-[10px] font-bold text-accent-ink">
                    {extraCount}
                  </span>
                ) : null}
              </span>
              <ChevronDownIcon
                className={cn('size-4 transition-transform', expanded && 'rotate-180')}
              />
            </Button>
            <Button type="submit" className="h-11 w-24 rounded-[8px] shadow-press">
              筛选
            </Button>
          </div>

          {/* 折叠时用 hidden 而不是条件渲染：已选条件在提交时仍要带上 */}
          <div
            id="home-extra-filters"
            className={cn(
              'mt-3 grid grid-cols-2 gap-3 border-t-2 border-dotted border-line pt-3',
              !expanded && 'hidden',
            )}
          >
            {domain === 'GAME' ? (
              <>
                <div className="col-span-2">
                  <Label htmlFor="filter-game">游戏</Label>
                  {/* 游戏列表是异步加载的，用 key 让 select 在选项到位后重新挂载，defaultValue 才能生效 */}
                  <Select
                    key={`game-select-${games.data?.length ?? 0}`}
                    id="filter-game"
                    name="gameId"
                    defaultValue={initial.gameId}
                  >
                    <option value="">全部游戏</option>
                    {(games.data ?? []).map((game) => (
                      <option key={game.id} value={game.id}>
                        {game.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="filter-platform">平台</Label>
                  <Select id="filter-platform" name="platform" defaultValue={initial.platform}>
                    <option value="">全部平台</option>
                    {PLATFORMS.map((platform) => (
                      <option key={platform} value={platform}>
                        {PLATFORM_LABELS[platform]}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="filter-city">城市</Label>
                  <Input
                    id="filter-city"
                    name="city"
                    defaultValue={initial.city}
                    placeholder="线下开黑的城市，选填"
                  />
                </div>
              </>
            ) : null}

            {domain === 'CONCERT' ? (
              <>
                <div>
                  <Label htmlFor="filter-city">城市</Label>
                  <Input
                    id="filter-city"
                    name="city"
                    defaultValue={initial.city}
                    placeholder="上海"
                  />
                </div>
                <div>
                  <Label htmlFor="filter-seat">座位区域</Label>
                  <Select id="filter-seat" name="seatType" defaultValue={initial.seatType}>
                    <option value="">不限</option>
                    {SEATS.map((seat) => (
                      <option key={seat} value={seat}>
                        {CONCERT_SEAT_LABELS[seat]}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            ) : null}

            {domain === 'TRAVEL' ? (
              <>
                <div>
                  <Label htmlFor="filter-destination">目的地</Label>
                  <Input
                    id="filter-destination"
                    name="destination"
                    defaultValue={initial.destination}
                    placeholder="大理"
                  />
                </div>
                <div>
                  <Label htmlFor="filter-budget">预算上限（元）</Label>
                  <Input
                    id="filter-budget"
                    name="budgetMax"
                    type="number"
                    min={0}
                    step={500}
                    defaultValue={initial.budgetMax}
                    placeholder="不限"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="filter-transport">交通方式</Label>
                  <Select id="filter-transport" name="transport" defaultValue={initial.transport}>
                    <option value="">不限</option>
                    {TRANSPORTS.map((transport) => (
                      <option key={transport} value={transport}>
                        {TRAVEL_TRANSPORT_LABELS[transport]}
                      </option>
                    ))}
                  </Select>
                </div>
              </>
            ) : null}

            <div>
              <Label htmlFor="filter-from">开始日期</Label>
              <Input id="filter-from" type="date" name="startFrom" defaultValue={initial.startFrom} />
            </div>
            <div>
              <Label htmlFor="filter-to">结束日期</Label>
              <Input id="filter-to" type="date" name="startTo" defaultValue={initial.startTo} />
            </div>
          </div>
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">已选</span>
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={hrefWith(chip.key, '')}
              className="inline-flex items-center gap-1 rounded-[3px] border border-accent/55 bg-accent/15 px-2 py-1 text-[11px] font-medium text-accent transition-colors hover:border-accent hover:text-accent-highlight"
            >
              {chip.label}
              <CloseIcon className="size-3" />
            </Link>
          ))}
          <Link
            href={domain === 'GAME' ? '/' : `/?domain=${domain}`}
            className="ml-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint underline underline-offset-2 hover:text-ink-muted"
          >
            清空
          </Link>
        </div>
      ) : null}
    </form>
  );
}

/** 领域快捷筛选的小色块，配色跟着领域走 */
/* ChipLink 的 children 允许带数字片段，所以用 ReactNode 而不是 string */
function ChipLink({
  href,
  active,
  domain,
  children,
}: {
  href: string;
  active: boolean;
  domain: Domain;
  children: ReactNode;
}) {
  const meta = DOMAIN_META[domain];
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-[4px] px-2 py-1 text-[11px] font-semibold transition-colors',
        active ? cn(meta.solid, 'shadow-card') : cn('border', meta.chip, 'hover:brightness-125'),
      )}
    >
      {children}
    </Link>
  );
}
