import Link from 'next/link';
import { HIKING_DIFFICULTY_LABELS, HIKING_ROUTES, hikingRouteOf } from '@allisteam/shared';
import { HikingRouteMap } from '@/components/hiking-route-map';
import { ChevronRightIcon, FlagIcon } from '@/components/icons';
import { HIKING_DIFFICULTY_DOT, HIKING_DIFFICULTY_TONE } from '@/lib/hiking';
import { cn } from '@/lib/utils';

/** 首页只露出三条风格不同的路线：一条雪山、一条古道、一条高海拔 */
const FEATURED_SLUGS = ['yubeng-shenpu', 'huihang-gudao', 'yading-long-line'];

function MiniRouteCard({ slug }: { slug: string }) {
  const route = hikingRouteOf(slug);
  if (!route) {
    return null;
  }

  return (
    <Link
      href={`/travel/hikes/${route.slug}`}
      aria-label={route.name}
      className="group w-[224px] shrink-0 md:w-auto"
    >
      <article className="h-full overflow-hidden rounded-[10px] border border-line bg-surface shadow-card transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-tone-3/45 group-hover:shadow-raised">
        <HikingRouteMap
          map={route.map}
          routeName={route.name}
          variant="mini"
          className="rounded-none border-0 border-b border-line"
        />
        <div className="p-2.5">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[9px] font-bold',
                HIKING_DIFFICULTY_TONE[route.difficulty],
              )}
            >
              <span
                className={cn('size-1.5 rounded-full', HIKING_DIFFICULTY_DOT[route.difficulty])}
              />
              {HIKING_DIFFICULTY_LABELS[route.difficulty]}
            </span>
            <span className="truncate font-mono text-[8px] uppercase tracking-[0.08em] text-ink-faint">
              {route.province}
            </span>
          </div>
          <p className="mt-1.5 truncate text-[13px] font-bold">{route.name}</p>
          <p className="mt-0.5 truncate font-mono text-[9px] tabular-nums text-ink-faint">
            {route.duration} · {route.distanceKm} km · 爬升 {route.ascentM.toLocaleString('en-US')} m
          </p>
        </div>
      </article>
    </Link>
  );
}

/** 旅行列表页的攻略入口：放在筛选和局列表之间，不打断找局的主路径 */
export function TravelHikingStrip() {
  return (
    <section className="mt-5" aria-labelledby="travel-hiking-title">
      <div className="flex items-end justify-between gap-2 border-b-2 border-line pb-2">
        <h2
          id="travel-hiking-title"
          className="flex items-baseline gap-2 text-[13px] font-bold tracking-tight"
        >
          <FlagIcon className="size-3.5 translate-y-0.5 text-tone-3" />
          徒步攻略
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
            TRAIL NOTES
          </span>
        </h2>
        <Link
          href="/travel/hikes"
          className="inline-flex h-8 shrink-0 items-center gap-0.5 text-[11px] font-semibold text-tone-3 transition-colors hover:text-ink"
        >
          全部 {HIKING_ROUTES.length} 条
          <ChevronRightIcon className="size-3.5" />
        </Link>
      </div>

      <div className="-mx-4 mt-2.5 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
        {FEATURED_SLUGS.map((slug) => (
          <MiniRouteCard key={slug} slug={slug} />
        ))}
      </div>

      <p className="mt-1.5 text-[10px] leading-relaxed text-ink-faint">
        路线、时长与携带物品为人工整理，小地图仅作示意；出行前以景区当日公告为准。
      </p>
    </section>
  );
}
