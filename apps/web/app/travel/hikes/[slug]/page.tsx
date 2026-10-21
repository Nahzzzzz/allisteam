import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  HIKING_DIFFICULTY_LABELS,
  HIKING_ROUTES,
  hikingRouteOf,
} from '@allisteam/shared';
import { HikingRouteMap } from '@/components/hiking-route-map';
import { AlertIcon, ArrowLeftIcon, CheckIcon, ClockIcon, FlagIcon } from '@/components/icons';
import { buttonVariants } from '@/components/ui/button';
import { HIKING_DIFFICULTY_DOT, HIKING_DIFFICULTY_TONE } from '@/lib/hiking';
import { cn } from '@/lib/utils';

interface HikingRoutePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): { slug: string }[] {
  return HIKING_ROUTES.map((route) => ({ slug: route.slug }));
}

export async function generateMetadata({
  params,
}: HikingRoutePageProps): Promise<Metadata> {
  const { slug } = await params;
  const route = hikingRouteOf(slug);
  if (!route) {
    return { title: '路线不存在 · AllieTeam' };
  }
  return {
    title: `${route.name}徒步攻略 · AllieTeam`,
    description: `${route.region}·${route.name}：${route.duration}、约 ${route.distanceKm} km、累计爬升 ${route.ascentM} m。${route.summary}`,
  };
}

function SectionLabel({ children }: { children: string }) {
  return (
    <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
      <span className="h-3 w-0.5 rounded-full bg-tone-3" />
      {children}
    </h2>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-[8px] border border-line bg-surface px-3 py-2.5', className)}>
      <dt className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-faint">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold leading-snug text-ink/90">{value}</dd>
    </div>
  );
}

export default async function HikingRoutePage({ params }: HikingRoutePageProps) {
  const { slug } = await params;
  const route = hikingRouteOf(slug);
  if (!route) {
    notFound();
  }

  const newPostHref = `/posts/new?domain=TRAVEL&destination=${encodeURIComponent(route.destination)}`;
  const browseHref = `/?domain=TRAVEL&destination=${encodeURIComponent(route.destination)}`;

  return (
    <main className="px-4 pb-24 pt-4 md:px-8 md:pb-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/travel/hikes"
          className="inline-flex h-11 items-center gap-1 rounded-lg pr-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeftIcon className="size-5" />
          徒步攻略
        </Link>

        <header className="mt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-[3px] border px-2 py-1 text-[10px] font-bold',
                HIKING_DIFFICULTY_TONE[route.difficulty],
              )}
            >
              <span
                className={cn('size-1.5 rounded-full', HIKING_DIFFICULTY_DOT[route.difficulty])}
              />
              {HIKING_DIFFICULTY_LABELS[route.difficulty]}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-faint">
              {route.region}
            </span>
            <span aria-hidden="true" className="text-ink-faint/70">
              ·
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-muted">
              <ClockIcon className="size-3.5" />
              {route.duration}
            </span>
          </div>

          <h1 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.02em]">
            {route.name}
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{route.summary}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {route.highlights.map((highlight) => (
              <span
                key={highlight}
                className="rounded-[3px] border border-tone-3/30 bg-tone-3/10 px-2 py-1 text-[10px] font-semibold text-tone-3"
              >
                {highlight}
              </span>
            ))}
          </div>
        </header>

        <dl className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
          <Stat label="推荐时长" value={route.duration} />
          <Stat label="总里程" value={`约 ${route.distanceKm} km`} />
          <Stat label="累计爬升" value={`约 ${route.ascentM.toLocaleString('en-US')} m`} />
          <Stat label="海拔范围" value={route.altitude} />
          <Stat label="最佳季节" value={route.bestSeason} />
          <Stat label="参考人均" value={route.budgetHint} className="col-span-2 md:col-span-1" />
        </dl>

        <section className="mt-6">
          <SectionLabel>示意路线</SectionLabel>
          <HikingRouteMap
            map={route.map}
            routeName={route.name}
            variant="full"
            showElevation
            className="mt-2"
          />
          <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-ink-faint">
            <FlagIcon className="mt-0.5 size-3 shrink-0 text-tone-3" />
            起点：{route.startPoint}。小地图与海拔剖面只表示相对位置与高低，不提供导航与轨迹。
          </p>
        </section>

        <section className="mt-6">
          <SectionLabel>行程安排</SectionLabel>
          <ol className="mt-2 space-y-2.5">
            {route.stages.map((stage) => (
              <li
                key={`${stage.day}-${stage.title}`}
                className="relative border-l-2 border-tone-3/25 pl-4"
              >
                <span
                  aria-hidden="true"
                  className="absolute -left-[5px] top-2 size-2 rounded-full bg-tone-3"
                />
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="rounded-[3px] bg-tone-3/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-tone-3">
                    {stage.day}
                  </span>
                  <h3 className="text-[13px] font-bold leading-snug">{stage.title}</h3>
                  {stage.distanceKm > 0 ? (
                    <span className="ml-auto font-mono text-[10px] tabular-nums text-ink-faint">
                      {stage.distanceKm} km
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">{stage.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-6">
          <SectionLabel>携带物品</SectionLabel>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {route.gear.map((group) => (
              <div key={group.label} className="rounded-[10px] border border-line bg-surface p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-tone-3">
                  <span className="size-1.5 rounded-full bg-tone-3" />
                  {group.label}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-1.5 text-[11px] leading-snug text-ink-muted"
                    >
                      <CheckIcon className="mt-0.5 size-3 shrink-0 text-lime" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <SectionLabel>出发前注意</SectionLabel>
          <ul className="mt-2 space-y-1.5">
            {route.tips.map((tip) => (
              <li
                key={tip}
                className="flex items-start gap-2 rounded-[8px] border border-amber/20 bg-amber/5 px-3 py-2 text-[11px] leading-relaxed text-ink-muted"
              >
                <AlertIcon className="mt-0.5 size-3.5 shrink-0 text-amber" />
                {tip}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-[12px] border border-tone-3/30 bg-tone-3/6 p-4">
          <p className="text-sm font-bold">按这条路线发一个局</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
            目的地会预填为「{route.destination}」，写清出发日期、预算和强度，等节奏相近的人报名。
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Link href={newPostHref} className={buttonVariants({ size: 'md' })}>
              用这条路线发局
            </Link>
            <Link
              href={browseHref}
              className={buttonVariants({ variant: 'secondary', size: 'md' })}
            >
              看看谁要去
            </Link>
          </div>
        </section>

        <p className="mt-6 border-t border-dashed border-line pt-3 text-[10px] leading-relaxed text-ink-faint">
          路线信息为人工整理，可能随景区规定、天气和季节变化；平台不提供向导、救援、住宿与交通预订。
          出发前请确认开放状态与自身保险，量力而行。
        </p>
      </div>
    </main>
  );
}
