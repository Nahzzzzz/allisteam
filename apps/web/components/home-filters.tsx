'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { GameView, Platform } from '@allisteam/shared';
import { PLATFORM_LABELS } from '@allisteam/shared';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { toneOf } from '@/lib/tone';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, CloseIcon, SearchIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const PLATFORMS = Object.keys(PLATFORM_LABELS) as Platform[];

export interface HomeFilterValues {
  q: string;
  gameId: string;
  platform: string;
  startFrom: string;
  startTo: string;
}

type FilterKey = keyof HomeFilterValues;

interface Chip {
  key: FilterKey;
  label: string;
}

export function HomeFilters({ initial }: { initial: HomeFilterValues }) {
  const [expanded, setExpanded] = useState(
    Boolean(initial.gameId || initial.platform || initial.startFrom || initial.startTo),
  );

  const games = useQuery({
    queryKey: queryKeys.games(),
    queryFn: () => apiFetch<GameView[]>('/games'),
  });

  const gameName = games.data?.find((game) => game.id === initial.gameId)?.name ?? '指定游戏';
  const extraCount = [initial.gameId, initial.platform, initial.startFrom, initial.startTo].filter(
    Boolean,
  ).length;

  const chips: Chip[] = [];
  if (initial.q) chips.push({ key: 'q', label: `“${initial.q}”` });
  if (initial.gameId) chips.push({ key: 'gameId', label: gameName });
  if (initial.platform) {
    chips.push({
      key: 'platform',
      label: PLATFORM_LABELS[initial.platform as Platform] ?? initial.platform,
    });
  }
  if (initial.startFrom) chips.push({ key: 'startFrom', label: `${initial.startFrom} 起` });
  if (initial.startTo) chips.push({ key: 'startTo', label: `至 ${initial.startTo}` });

  /** 换掉一个条件，其余原样带上；value 为空就表示移除该条件 */
  function hrefWith(key: FilterKey, value: string): string {
    const params = new URLSearchParams();
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

  const quickGames = (games.data ?? []).slice(0, 6);

  return (
    <form action="/" method="get" className="mt-3">
      <div className="overflow-hidden rounded-[12px] border border-line bg-surface shadow-card">
        {/* 票据抬头：左边用途，右边当前生效的条件数量 */}
        <div className="flex items-center justify-between border-b border-line bg-surface-2/50 px-3 py-1.5">
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ink-faint">
            Filter / 筛选
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
            {extraCount > 0 ? `${extraCount} 项已选` : '全部局'}
          </span>
        </div>

        <div className="p-3">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input
              name="q"
              defaultValue={initial.q}
              placeholder="搜局名、段位、平台…"
              aria-label="搜索局"
              className="h-12 rounded-[8px] border-line-strong/70 bg-canvas pl-9 text-[13px]"
            />
          </div>

          {quickGames.length > 0 ? (
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
            <div className="col-span-2">
              <Label htmlFor="filter-game">游戏</Label>
              <Select id="filter-game" name="gameId" defaultValue={initial.gameId}>
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
            href="/"
            className="ml-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint underline underline-offset-2 hover:text-ink-muted"
          >
            清空
          </Link>
        </div>
      ) : null}
    </form>
  );
}
