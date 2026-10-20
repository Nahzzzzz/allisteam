import type { ReactNode } from 'react';

/** 登录 / 注册共用的外壳：品牌 + 一张「入场券」式的表单卡片 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="px-4 pb-24 pt-9 md:px-8 md:pb-12 md:pt-16">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex items-end justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="relative grid size-11 place-items-center rounded-[9px] bg-accent text-lg font-black text-accent-ink shadow-press">
              A
              <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border-2 border-canvas bg-lime" />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide">AllieTeam</p>
              <p className="text-[11px] text-ink-faint">同一时间，玩得来的人</p>
            </div>
          </div>
          <span className="mb-1 rotate-[-7deg] rounded-[5px] border border-accent/45 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-accent/90">
            Game Only
          </span>
        </div>

        <h1 className="mt-8 text-[30px] font-black leading-tight tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{description}</p>

        {/* 表单 = 一张票：票头写用途，虚线打孔后是正文 */}
        <div className="mt-5 overflow-hidden rounded-[14px] border border-line-strong/60 shadow-ticket">
          <div aria-hidden="true" className="color-strip h-1" />
          <div className="paper-print relative px-4 py-2.5">
            <div className="relative flex items-center justify-between font-mono text-[9px] font-bold uppercase tracking-[0.16em]">
              <span className="inline-flex items-center gap-1.5 text-paper-ink">
                <span className="size-1.5 rounded-full bg-signal" />
                Admit One · 入场券
              </span>
              <span className="text-paper-muted">No. 001</span>
            </div>
          </div>

          <div className="relative border-t-2 border-dashed border-paper-ink/30 bg-surface">
            <span
              aria-hidden="true"
              className="perforation absolute -left-[7px] -top-[7px] size-3.5 rounded-full"
            />
            <span
              aria-hidden="true"
              className="perforation absolute -right-[7px] -top-[7px] size-3.5 rounded-full"
            />
            <div className="px-4 py-4">{children}</div>
          </div>
        </div>

        <div className="mt-5 text-center text-xs text-ink-muted">{footer}</div>
      </div>
    </main>
  );
}
