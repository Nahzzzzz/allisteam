import Link from 'next/link';
import { HomeFilters } from '@/components/home-filters';
import { PostsList, type PostFilters } from '@/components/posts-list';
import { TravelHikingStrip } from '@/components/travel-hiking-strip';
import { DOMAIN_META, DOMAIN_ORDER, domainOf } from '@/lib/domain';
import { cn } from '@/lib/utils';

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
  const domain = domainOf(pick(params.domain));
  const meta = DOMAIN_META[domain];

  const initial = {
    q: pick(params.q),
    gameId: pick(params.gameId),
    platform: pick(params.platform),
    city: pick(params.city),
    artist: pick(params.artist),
    seatType: pick(params.seatType),
    destination: pick(params.destination),
    budgetMax: pick(params.budgetMax),
    transport: pick(params.transport),
    startFrom: pick(params.startFrom),
    startTo: pick(params.startTo),
  };

  // 切换领域时只带对应领域的筛选条件，避免把 gameId 带到旅行列表里
  const filters: PostFilters = {
    domain,
    q: initial.q || undefined,
    gameId: domain === 'GAME' ? initial.gameId || undefined : undefined,
    platform: domain === 'GAME' ? initial.platform || undefined : undefined,
    city: domain === 'TRAVEL' ? undefined : initial.city || undefined,
    artist: domain === 'CONCERT' ? initial.artist || undefined : undefined,
    seatType: domain === 'CONCERT' ? initial.seatType || undefined : undefined,
    destination: domain === 'TRAVEL' ? initial.destination || undefined : undefined,
    budgetMax: domain === 'TRAVEL' ? initial.budgetMax || undefined : undefined,
    transport: domain === 'TRAVEL' ? initial.transport || undefined : undefined,
    startFrom: toDayStart(initial.startFrom),
    startTo: toDayEnd(initial.startTo),
  };

  return (
    <main className="px-4 pb-24 pt-5 md:px-8 md:pb-12 md:pt-8">
      {/* 票头：上半截是印出来的纸票面，虚线打孔后是深色副券 */}
      <header className="relative overflow-hidden rounded-[14px] border border-line-strong/60 bg-surface shadow-ticket">
        <div aria-hidden="true" className="color-strip h-1" />

        <div className="paper-print relative px-4 pb-4 pt-3">
          <div className="flex items-center justify-between font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-paper-muted">
            <span>AllieTeam Presents</span>
            <span>Vol.03 / 2026</span>
          </div>

          <div className="mt-4 flex items-start justify-between gap-2">
            <div>
              <h1 className="text-[46px] font-black leading-[0.82] tracking-[-0.05em]">
                找<span className="text-signal">局</span>
              </h1>
              <p className="mt-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-paper-muted">
                Find your crew
              </p>
            </div>
            <span className="mt-1 grid size-[58px] shrink-0 -rotate-6 place-items-center rounded-full border-2 border-signal/70 text-center font-mono text-[8px] font-bold uppercase leading-[1.25] tracking-[0.1em] text-signal">
              Admit
              <br />
              One
            </span>
          </div>

          <p className="mt-3 text-[13px] font-medium leading-snug text-paper-ink/70">{meta.intro}</p>

          {/* 三个领域 = 票面上并排的三个色块，当前领域的色块实心压下去 */}
          <div className="mt-4 grid grid-cols-3 gap-1.5">
            {DOMAIN_ORDER.map((item) => {
              const itemMeta = DOMAIN_META[item];
              const active = item === domain;
              return (
                <Link
                  key={item}
                  href={item === 'GAME' ? '/' : `/?domain=${item}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center justify-between rounded-[4px] px-2 py-1.5 text-[11px] font-bold transition-colors',
                    active
                      ? itemMeta.solid
                      : 'border border-paper-ink/15 bg-paper-2/70 text-paper-ink/55 hover:bg-paper-2 hover:text-paper-ink/80',
                  )}
                >
                  {itemMeta.label}
                  <span className="font-mono text-[8px] tracking-[0.06em] opacity-80">
                    {itemMeta.code}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 副券：两个半圆缺口切开票面和票根 */}
        <div className="relative border-t-2 border-dashed border-paper-ink/30 bg-surface">
          <span
            aria-hidden="true"
            className="perforation absolute -left-[7px] -top-[7px] size-3.5 rounded-full"
          />
          <span
            aria-hidden="true"
            className="perforation absolute -right-[7px] -top-[7px] size-3.5 rounded-full"
          />
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="truncate font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
              {meta.caption}
            </span>
            <span aria-hidden="true" className="barcode ml-auto h-5 w-16 text-ink-faint/60" />
            <span className="flex items-center gap-1.5 border-l border-dashed border-line-strong/70 pl-3">
              <span className="size-1.5 animate-pulse-dot rounded-full bg-lime" />
              <span className="font-mono text-[9px] tracking-[0.1em] text-lime">LIVE</span>
            </span>
          </div>
        </div>
      </header>

      <HomeFilters domain={domain} initial={initial} />
      {domain === 'TRAVEL' ? <TravelHikingStrip /> : null}
      <PostsList filters={filters} />
    </main>
  );
}
