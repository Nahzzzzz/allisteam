import Link from 'next/link';
import { HIKING_DIFFICULTY_LABELS, type HikingRoute } from '@allisteam/shared';
import { HikingRouteMap } from '@/components/hiking-route-map';
import { ChevronRightIcon, ClockIcon } from '@/components/icons';
import { HIKING_DIFFICULTY_DOT, HIKING_DIFFICULTY_TONE } from '@/lib/hiking';
import { cn } from '@/lib/utils';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-mono text-[8px] uppercase tracking-[0.1em] text-ink-faint">{label}</p>
      <p className="mt-0.5 truncate font-mono text-[11px] font-semibold tabular-nums text-ink/90">
        {value}
      </p>
    </div>
  );
}

/** 攻略列表卡：上半截是示意路线，下半截把时长、里程、爬升压成一张小票 */
export function HikingRouteCard({ route }: { route: HikingRoute }) {
  return (
    <Link href={`/travel/hikes/${route.slug}`} aria-label={route.name} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-[12px] border border-line bg-surface shadow-card transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-line-strong group-hover:shadow-raised">
        <HikingRouteMap
          map={route.map}
          routeName={route.name}
          variant="compact"
          className="rounded-none border-0 border-b border-line"
        />

        <div className="flex flex-1 flex-col p-3">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[10px] font-bold',
                HIKING_DIFFICULTY_TONE[route.difficulty],
              )}
            >
              <span
                className={cn('size-1.5 rounded-full', HIKING_DIFFICULTY_DOT[route.difficulty])}
              />
              {HIKING_DIFFICULTY_LABELS[route.difficulty]}
            </span>
            <span className="truncate font-mono text-[9px] uppercase tracking-[0.1em] text-ink-faint">
              {route.region}
            </span>
          </div>

          <h3 className="mt-2 text-[15px] font-bold leading-snug tracking-[-0.01em] transition-colors group-hover:text-tone-3">
            {route.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-ink-muted">
            {route.summary}
          </p>

          <div className="mt-auto flex items-center gap-1.5 pt-2.5 text-[11px] text-ink-muted">
            <ClockIcon className="size-3.5 text-tone-3" />
            <span className="font-medium">{route.duration}</span>
            <span aria-hidden="true" className="text-ink-faint/70">
              ·
            </span>
            <span className="truncate">{route.bestSeason}</span>
            <ChevronRightIcon className="ml-auto size-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-tone-3" />
          </div>

          <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-dashed border-line pt-2">
            <Stat label="里程" value={`${route.distanceKm} km`} />
            <Stat label="爬升" value={`${route.ascentM.toLocaleString('en-US')} m`} />
            <Stat label="海拔" value={route.altitude.split('–')[1] ?? route.altitude} />
          </div>
        </div>
      </article>
    </Link>
  );
}
