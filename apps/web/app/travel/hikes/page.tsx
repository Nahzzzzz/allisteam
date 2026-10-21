import type { Metadata } from 'next';
import Link from 'next/link';
import {
  HIKING_DIFFICULTIES,
  HIKING_DIFFICULTY_LABELS,
  HIKING_PROVINCES,
  HIKING_ROUTES,
  filterHikingRoutes,
  type HikingDifficulty,
} from '@allisteam/shared';
import { HikingRouteCard } from '@/components/hiking-route-card';
import { ArrowLeftIcon, FlagIcon } from '@/components/icons';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: '国内热门徒步路线攻略 · AllieTeam',
  description:
    '雨崩、武功山、徽杭古道、虎跳峡、长坪沟、黄山等热门徒步路线的推荐时长、里程、携带物品与示意小地图。',
};

interface HikesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pick(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function levelOf(value: string): HikingDifficulty | undefined {
  return HIKING_DIFFICULTIES.find((level) => level === value);
}

function hrefWith(level: HikingDifficulty | undefined, province: string | undefined): string {
  const params = new URLSearchParams();
  if (level) {
    params.set('level', level);
  }
  if (province) {
    params.set('province', province);
  }
  const query = params.toString();
  return query ? `/travel/hikes?${query}` : '/travel/hikes';
}

function ChipLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: string;
}) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 shrink-0 items-center rounded-[4px] px-2.5 text-[11px] font-semibold transition-colors',
        active
          ? 'bg-tone-3 text-canvas shadow-card'
          : 'border border-tone-3/30 bg-tone-3/8 text-tone-3 hover:border-tone-3/60',
      )}
    >
      {children}
    </Link>
  );
}

export default async function HikesPage({ searchParams }: HikesPageProps) {
  const params = await searchParams;
  const level = levelOf(pick(params.level));
  const rawProvince = pick(params.province);
  const province = HIKING_PROVINCES.includes(rawProvince) ? rawProvince : undefined;
  const routes = filterHikingRoutes({ difficulty: level, province });
  const filtered = Boolean(level || province);

  return (
    <main className="px-4 pb-24 pt-4 md:px-8 md:pb-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/?domain=TRAVEL"
          className="inline-flex h-11 items-center gap-1 rounded-lg pr-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeftIcon className="size-5" />
          回旅行列表
        </Link>

        <header className="relative mt-1 overflow-hidden rounded-[14px] border border-line-strong/60 bg-surface shadow-ticket">
          <div aria-hidden="true" className="color-strip h-1" />
          <div className="bg-stage px-4 py-4 md:px-5">
            <div className="flex items-center justify-between font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-ink-faint">
              <span>Travel / Trail Notes</span>
              <span className="tabular-nums">{HIKING_ROUTES.length} Routes</span>
            </div>

            <h1 className="mt-2 text-[28px] font-black leading-tight tracking-[-0.02em]">
              徒步路线<span className="text-tone-3">攻略</span>
            </h1>
            <p className="mt-1.5 max-w-xl text-[12px] leading-relaxed text-ink-muted">
              国内热门路线先看这一页：推荐时长、里程与爬升、最佳季节、逐日行程和携带物品。
              看完可以直接按路线发一个局，找节奏相近的人一起走。
            </p>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {['推荐时长', '携带物品', '逐日行程', '示意小地图'].map((item) => (
                <span
                  key={item}
                  className="rounded-[3px] border border-tone-3/30 bg-tone-3/10 px-2 py-1 text-[10px] font-semibold text-tone-3"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </header>

        <section className="mt-4" aria-label="筛选徒步路线">
          <div className="overflow-hidden rounded-[12px] border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line bg-surface-2/50 px-3 py-1.5">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-ink-faint">
                Filter / Hiking
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-faint">
                {filtered ? '已筛选' : '全部路线'}
              </span>
            </div>

            <div className="space-y-2.5 p-3">
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <ChipLink href={hrefWith(undefined, province)} active={!level}>
                  全部难度
                </ChipLink>
                {HIKING_DIFFICULTIES.map((item) => (
                  <ChipLink
                    key={item}
                    href={hrefWith(item, province)}
                    active={level === item}
                  >
                    {HIKING_DIFFICULTY_LABELS[item]}
                  </ChipLink>
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5 border-t border-dashed border-line pt-2.5">
                <ChipLink href={hrefWith(level, undefined)} active={!province}>
                  全部地区
                </ChipLink>
                {HIKING_PROVINCES.map((item) => (
                  <ChipLink
                    key={item}
                    href={hrefWith(level, item)}
                    active={province === item}
                  >
                    {item}
                  </ChipLink>
                ))}
              </div>
            </div>
          </div>

          {filtered ? (
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-[10px] tabular-nums text-ink-faint">
                {routes.length} 条符合条件的路线
              </span>
              <Link
                href="/travel/hikes"
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-tone-3 underline underline-offset-2 hover:text-ink"
              >
                清空筛选
              </Link>
            </div>
          ) : null}
        </section>

        {routes.length > 0 ? (
          <section className="mt-4" aria-label="徒步路线列表">
            <div className="grid gap-2.5 md:grid-cols-2 md:gap-3">
              {routes.map((route) => (
                <HikingRouteCard key={route.slug} route={route} />
              ))}
            </div>
          </section>
        ) : (
          <EmptyState
            icon={<FlagIcon />}
            title="这个组合下还没有路线"
            description="换个难度或地区看看，攻略库还在补充。"
            action={
              <Link href="/travel/hikes" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                看全部路线
              </Link>
            }
          />
        )}

        <p className="mt-6 border-t border-dashed border-line pt-3 text-[10px] leading-relaxed text-ink-faint">
          攻略为人工整理的参考信息，里程、爬升与耗时因季节、天气和个人体能而异；小地图与海拔剖面仅作示意，
          不提供导航与轨迹。进山前请查景区公告，按自身经验选择路线。
        </p>
      </div>
    </main>
  );
}
