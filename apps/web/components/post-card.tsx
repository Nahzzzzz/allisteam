import Link from 'next/link';
import {
  CONCERT_SEAT_LABELS,
  PLATFORM_LABELS,
  TRAVEL_INTENSITY_LABELS,
  TRAVEL_TRANSPORT_LABELS,
  type ConcertSeat,
  type Platform,
  type PostSummary,
  type TravelIntensity,
  type TravelTransport,
} from '@allisteam/shared';
import { MicIcon, StarIcon } from '@/components/icons';
import { domainOf } from '@/lib/domain';
import { formatBudget, formatClock, formatDateRange, ticketDateParts } from '@/lib/format';
import { toneOf } from '@/lib/tone';
import { cn } from '@/lib/utils';

function initialOf(nickname: string): string {
  return nickname.trim().slice(0, 1).toUpperCase() || '?';
}

export function PostCard({ post }: { post: PostSummary }) {
  const remaining = post.capacity - post.memberCount;
  const full = remaining <= 0;
  const urgent = !full && remaining <= 1;

  const domain = domainOf(post.domain);
  const primary = post.game?.name ?? post.concert?.artist ?? post.travel?.destination ?? '局';
  const tone = toneOf(primary);
  const authorTone = toneOf(post.author.nickname);
  const date = ticketDateParts(post.startTime);

  const seatLabel = post.concert?.seatType
    ? (CONCERT_SEAT_LABELS[post.concert.seatType as ConcertSeat] ?? post.concert.seatType)
    : null;
  const transportLabel = post.travel?.transport
    ? (TRAVEL_TRANSPORT_LABELS[post.travel.transport as TravelTransport] ?? post.travel.transport)
    : null;
  const intensityLabel = post.travel?.intensity
    ? (TRAVEL_INTENSITY_LABELS[post.travel.intensity as TravelIntensity] ?? post.travel.intensity)
    : null;
  const rank =
    post.rankMin || post.rankMax
      ? `${post.rankMin ?? '不限'}–${post.rankMax ?? '不限'}`
      : '段位不限';

  const seatFill = full ? 'bg-ink-faint/40' : tone.dot;

  return (
    <Link href={`/posts/${post.id}`} aria-label={post.title} className="group block">
      <article className="relative overflow-hidden rounded-[12px] border border-line bg-surface shadow-card transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-line-strong group-hover:shadow-raised">
        <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-[3px]', tone.dot)} />

        <div className="flex gap-2.5 pb-3 pl-4 pr-3 pt-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'max-w-[46%] truncate rounded-[3px] px-1.5 py-1 text-[10px] font-bold leading-none',
                  tone.fill,
                )}
              >
                {primary}
              </span>

              {domain === 'GAME' ? (
                <>
                  {post.platform ? (
                    <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-muted">
                      {PLATFORM_LABELS[post.platform as Platform] ?? post.platform}
                    </span>
                  ) : null}

                  {post.mode ? (
                    <>
                      <span aria-hidden="true" className="text-[10px] text-ink-faint/70">
                        /
                      </span>
                      <span className="truncate text-[10px] text-ink-muted">{post.mode}</span>
                    </>
                  ) : null}

                  {post.needVoice ? (
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[10px] text-ice">
                      <MicIcon className="size-3" />
                      开麦
                    </span>
                  ) : null}
                </>
              ) : null}

              {domain === 'CONCERT' && seatLabel ? (
                <span className="shrink-0 rounded-[3px] border border-line-strong/60 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                  {seatLabel}
                </span>
              ) : null}

              {domain === 'CONCERT' ? (
                <span
                  className={cn(
                    'ml-auto shrink-0 rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold',
                    post.concert?.hasTicket
                      ? 'bg-lime/15 text-lime'
                      : 'bg-amber/15 text-amber',
                  )}
                >
                  {post.concert?.hasTicket ? '票已自备' : '还没票'}
                </span>
              ) : null}

              {domain === 'TRAVEL' && transportLabel ? (
                <span className="shrink-0 rounded-[3px] border border-line-strong/60 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                  {transportLabel}
                </span>
              ) : null}

              {domain === 'TRAVEL' && intensityLabel ? (
                <span className="shrink-0 text-[10px] text-ink-muted">{intensityLabel}</span>
              ) : null}
            </div>

            <h2 className="mt-2 line-clamp-2 text-[16px] font-bold leading-[1.3] tracking-[-0.01em] transition-colors group-hover:text-accent-highlight">
              {post.title}
            </h2>

            <div className="mt-2 flex items-center gap-2 font-mono text-[11px] tabular-nums">
              {domain === 'TRAVEL' ? (
                <>
                  <span className="text-[12px] font-semibold text-ink">
                    {formatDateRange(post.startTime, post.endTime)}
                  </span>
                  <span aria-hidden="true" className="h-2.5 w-px bg-line-strong" />
                  <span className="truncate text-ink-faint">
                    {formatBudget(post.travel?.budgetMin ?? null, post.travel?.budgetMax ?? null)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[12px] font-semibold text-ink">
                    {formatClock(post.startTime)}
                  </span>
                  <span aria-hidden="true" className="h-2.5 w-px bg-line-strong" />
                  <span className="truncate text-ink-faint">
                    {domain === 'CONCERT'
                      ? (post.concert?.venue ?? post.city ?? '场馆待定')
                      : rank}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 小票日期块：周几 / 日 / 月。每张卡按主标签色实心，扫列表时先看颜色再看数字 */}
          <div className="w-[46px] shrink-0 self-start overflow-hidden rounded-[6px] border border-line-strong/40 text-center">
            <p className={cn('py-1 text-[9px] font-bold leading-none', tone.fill)}>{date.top}</p>
            <p className="bg-canvas/50 py-1 font-mono text-[19px] font-black leading-none tabular-nums text-ink">
              {date.day}
            </p>
            <p className="pb-1 font-mono text-[8px] leading-none text-ink-faint">{date.month}</p>
          </div>
        </div>

        <div className="relative border-t border-dashed border-line">
          <span
            aria-hidden="true"
            className="perforation absolute -left-[7px] -top-[7px] size-3.5 rounded-full"
          />
          <span
            aria-hidden="true"
            className="perforation absolute -right-[7px] -top-[7px] size-3.5 rounded-full"
          />

          <div className="flex items-center justify-between gap-2 py-2 pl-4 pr-3">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-[4px] text-[10px] font-black',
                  authorTone.fill,
                )}
              >
                {initialOf(post.author.nickname)}
              </span>
              <span className="truncate text-[11px] text-ink-muted">{post.author.nickname}</span>
              <span className="inline-flex shrink-0 items-center gap-0.5 font-mono text-[10px] tabular-nums text-amber/90">
                <StarIcon className="size-3" />
                {post.author.trustScore}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-1.5">
              <span aria-hidden="true" className="flex items-center gap-[3px]">
                {Array.from({ length: Math.min(post.capacity, 6) }).map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      'h-3 w-[3px] rounded-[1px]',
                      index < post.memberCount ? seatFill : 'bg-line-strong/50',
                    )}
                  />
                ))}
              </span>
              <span
                className={cn(
                  'font-mono text-[10px] font-semibold tabular-nums',
                  full ? 'text-ink-faint' : urgent ? 'text-amber' : 'text-lime',
                )}
              >
                {full ? '满员' : `差 ${remaining} 人`}
              </span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
