'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CompassIcon, PlusIcon, UserIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/', label: '找局', Icon: CompassIcon },
  { href: '/posts/new', label: '发布', Icon: PlusIcon },
  { href: '/me', label: '我的', Icon: UserIcon },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/** 移动端底栏：中间的「发布」抬起来，和左右两个入口区分开 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主导航"
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-dashed border-line-strong/60 bg-canvas/95 backdrop-blur-xl md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3 pb-[env(safe-area-inset-bottom)]">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);

          if (href === '/posts/new') {
            return (
              <li key={href} className="flex justify-center">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className="group flex -translate-y-4 flex-col items-center gap-1"
                >
                  <span className="grid size-12 place-items-center rounded-[10px] bg-accent text-accent-ink shadow-press transition-transform group-active:translate-y-px">
                    <PlusIcon className="size-6" />
                  </span>
                  <span className="text-[10px] font-semibold text-ink-muted">发布</span>
                </Link>
              </li>
            );
          }

          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className="group flex h-16 w-full flex-col items-center justify-center gap-1.5"
              >
                <span
                  className={cn(
                    'grid size-7 place-items-center rounded-[6px] transition-colors',
                    active
                      ? 'bg-accent text-accent-ink shadow-glow'
                      : 'text-ink-faint group-hover:text-ink-muted',
                  )}
                >
                  <Icon className="size-[18px]" />
                </span>
                <span
                  className={cn(
                    'text-[10px] font-semibold transition-colors',
                    active ? 'text-ink' : 'text-ink-faint',
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** 桌面端侧边栏：只做增强，信息架构与移动端完全一致 */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="主导航"
      className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line px-4 py-6 md:flex"
    >
      <Link href="/" className="flex items-center gap-2.5 rounded-xl px-1 py-1">
        <span className="relative grid size-9 place-items-center rounded-[8px] bg-accent text-base font-black text-accent-ink shadow-press">
          A
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border-2 border-canvas bg-lime" />
        </span>
        <span className="text-sm font-semibold tracking-wide">AllieTeam</span>
      </Link>

      <nav className="mt-8 space-y-1">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'relative flex h-11 items-center gap-3 rounded-[6px] border border-transparent px-3 text-sm font-semibold transition-colors',
                active
                  ? 'bg-surface-2 text-ink'
                  : 'text-ink-muted hover:bg-surface-2/70 hover:text-ink',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full transition-colors',
                  active ? 'bg-accent' : 'bg-transparent',
                )}
              />
              <Icon className={cn('size-4', active && 'text-accent')} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div aria-hidden="true" className="color-strip mb-3 h-1 w-16 rounded-full" />
        <p className="text-[11px] leading-relaxed text-ink-faint">
          游戏、演唱会、旅行三个领域都已开放。发布时选一张票根，写清条件就行。
        </p>
        <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-ink-faint">
          <span className="size-1.5 rounded-full bg-lime" />
          OPEN FOR TONIGHT
        </p>
      </div>
    </aside>
  );
}
