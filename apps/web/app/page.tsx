import { HomeFilters } from '@/components/home-filters';
import { PostsList } from '@/components/posts-list';

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pick(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

/** 日期输入是 YYYY-MM-DD，接口需要完整时间：开始取当天 0 点，结束取当天 23:59:59 */
function toDayStart(value: string): string | undefined {
  return value ? new Date(`${value}T00:00:00`).toISOString() : undefined;
}

function toDayEnd(value: string): string | undefined {
  return value ? new Date(`${value}T23:59:59`).toISOString() : undefined;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  const initial = {
    q: pick(params.q),
    gameId: pick(params.gameId),
    platform: pick(params.platform),
    startFrom: pick(params.startFrom),
    startTo: pick(params.startTo),
  };

  const filters = {
    q: initial.q || undefined,
    gameId: initial.gameId || undefined,
    platform: initial.platform || undefined,
    startFrom: toDayStart(initial.startFrom),
    startTo: toDayEnd(initial.startTo),
  };

  return (
    <main>
      <header className="px-4 pt-6">
        <h1 className="text-xl font-semibold">找局</h1>
        <p className="mt-1 text-xs text-neutral-500">
          同一时间、同一游戏、玩得来的人，一起开一局。
        </p>
      </header>

      <HomeFilters initial={initial} />
      <PostsList filters={filters} />
    </main>
  );
}
