'use client';

import { useQuery } from '@tanstack/react-query';
import type { GameView, Platform } from '@allisteam/shared';
import { PLATFORM_LABELS } from '@allisteam/shared';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const PLATFORMS = Object.keys(PLATFORM_LABELS) as Platform[];

export interface HomeFilterValues {
  q: string;
  gameId: string;
  platform: string;
  startFrom: string;
  startTo: string;
}

export function HomeFilters({ initial }: { initial: HomeFilterValues }) {
  const games = useQuery({
    queryKey: queryKeys.games(),
    queryFn: () => apiFetch<GameView[]>('/games'),
  });

  return (
    <form action="/" method="get" className="space-y-2 px-4 pt-4">
      <Input name="q" defaultValue={initial.q} placeholder="搜索局，例如：排位、无畏契约" />

      <div className="grid grid-cols-2 gap-2">
        <Select name="gameId" defaultValue={initial.gameId} aria-label="游戏">
          <option value="">全部游戏</option>
          {(games.data ?? []).map((game) => (
            <option key={game.id} value={game.id}>
              {game.name}
            </option>
          ))}
        </Select>

        <Select name="platform" defaultValue={initial.platform} aria-label="平台">
          <option value="">全部平台</option>
          {PLATFORMS.map((platform) => (
            <option key={platform} value={platform}>
              {PLATFORM_LABELS[platform]}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input
          type="date"
          name="startFrom"
          defaultValue={initial.startFrom}
          aria-label="开始日期"
        />
        <Input type="date" name="startTo" defaultValue={initial.startTo} aria-label="结束日期" />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" className="flex-1">
          筛选
        </Button>
        <a
          href="/"
          className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-neutral-100 text-xs font-medium text-neutral-600"
        >
          重置
        </a>
      </div>
    </form>
  );
}
