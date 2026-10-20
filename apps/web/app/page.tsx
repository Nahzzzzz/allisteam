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
    <main className="px-4 pb-24 pt-5 md:px-8 md:pb-12 md:pt-8">
      {/* 票头：上半截是印出来的纸票面，虚线打孔后是深色副券 */}
      <header className="relative overflow-hidden rounded-[14px] border border-line-strong/60 bg-surface shadow-ticket">
        <div aria-hidden="true" className="color-strip h-1" />

        <div className="paper-print relative px-4 pb-4 pt-3">
          <div className="flex items-center justify-between font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-paper-muted">
            <span>AllieTeam Presents</span>
            <span>Vol.01 / 2026</span>
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

          <p className="mt-3 text-[13px] font-medium leading-snug text-paper-ink/70">
            同一时间、同一游戏，
            <br />
            找几个玩得来的人，一起开一局。
          </p>

          {/* 三个领域 = 票面上的分区块：当前开放的用实心橙，未开的只留描边 */}
          <div className="mt-4 grid grid-cols-3 gap-1.5">
            <span className="flex items-center justify-between rounded-[4px] bg-accent px-2 py-1.5 text-[11px] font-bold text-accent-ink">
              游戏
              <span className="font-mono text-[8px] tracking-[0.1em]">OPEN</span>
            </span>
            <span className="flex items-center justify-between rounded-[4px] border border-paper-ink/15 bg-paper-2/70 px-2 py-1.5 text-[11px] font-semibold text-paper-ink/50">
              演唱会
              <span className="font-mono text-[8px] tracking-[0.08em]">SOON</span>
            </span>
            <span className="flex items-center justify-between rounded-[4px] border border-paper-ink/15 bg-paper-2/70 px-2 py-1.5 text-[11px] font-semibold text-paper-ink/50">
              旅行
              <span className="font-mono text-[8px] tracking-[0.08em]">SOON</span>
            </span>
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
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
              排位 · 开黑 · 上分
            </span>
            <span aria-hidden="true" className="barcode ml-auto h-5 w-16 text-ink-faint/60" />
            <span className="flex items-center gap-1.5 border-l border-dashed border-line-strong/70 pl-3">
              <span className="size-1.5 animate-pulse-dot rounded-full bg-lime" />
              <span className="font-mono text-[9px] tracking-[0.1em] text-lime">LIVE</span>
            </span>
          </div>
        </div>
      </header>

      <HomeFilters initial={initial} />
      <PostsList filters={filters} />
    </main>
  );
}
