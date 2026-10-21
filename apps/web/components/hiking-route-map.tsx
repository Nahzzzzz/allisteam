import type { HikingElevationPoint, HikingMapPoint, HikingRoute } from '@allisteam/shared';
import { cn } from '@/lib/utils';

type HikingMapVariant = 'full' | 'compact' | 'mini';

interface HikingRouteMapProps {
  map: HikingRoute['map'];
  routeName: string;
  variant?: HikingMapVariant;
  showElevation?: boolean;
  className?: string;
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 64;
const CHART_PAD = 6;

/**
 * 把海拔采样点换算成 SVG 折线。数值只用于相对高低，不按真实比例；
 * 所有路线共用同一套画布，卡片和详情页的视觉重量才一致。
 */
function elevationGeometry(points: HikingElevationPoint[]): {
  line: string;
  area: string;
  dots: { x: number; y: number }[];
  min: number;
  max: number;
} {
  const min = Math.min(...points.map((point) => point.meters));
  const max = Math.max(...points.map((point) => point.meters));
  const span = Math.max(1, max - min);
  const step = points.length > 1 ? (CHART_WIDTH - CHART_PAD * 2) / (points.length - 1) : 0;

  const coords = points.map((point, index) => ({
    x: CHART_PAD + step * index,
    y: CHART_HEIGHT - CHART_PAD - ((point.meters - min) / span) * (CHART_HEIGHT - CHART_PAD * 2),
  }));

  const line = coords.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${CHART_PAD},${CHART_HEIGHT - CHART_PAD} ${line} ${
    CHART_WIDTH - CHART_PAD
  },${CHART_HEIGHT - CHART_PAD}`;

  return { line, area, dots: coords, min, max };
}

/** 路线点位的数字标记：和下方图例一一对应，避免 SVG 里塞长中文标签导致重叠 */
function MapMarker({
  point,
  index,
  compact,
}: {
  point: HikingMapPoint;
  index: number;
  compact: boolean;
}) {
  return (
    <g transform={`translate(${point.x} ${point.y})`}>
      <circle
        r={compact ? 5.5 : 7}
        className="fill-surface stroke-tone-3"
        strokeWidth={compact ? 1.4 : 1.8}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-ink font-mono text-[7px] font-bold"
      >
        {index + 1}
      </text>
    </g>
  );
}

/**
 * 示意路线小地图：用内联 SVG 画等高线、路线和点位，不引入地图 SDK。
 * 页面必须明确写「示意 · 非导航」，不能把它当成真实轨迹使用。
 */
export function HikingRouteMap({
  map,
  routeName,
  variant = 'full',
  showElevation = false,
  className,
}: HikingRouteMapProps) {
  const compact = variant !== 'full';
  const svgHeight = variant === 'mini' ? 'h-[86px]' : compact ? 'h-[132px]' : 'h-auto';
  const elevation = showElevation && !compact ? elevationGeometry(map.elevation) : null;

  return (
    <figure
      className={cn(
        'overflow-hidden rounded-[10px] border border-line bg-surface-2',
        className,
      )}
    >
      <div className="relative">
        <svg
          viewBox="0 0 320 180"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${routeName}路线示意图，仅作参考，不可用于导航`}
          className={cn(svgHeight, 'w-full text-tone-3')}
        >
          {/* 等高线：纯装饰，帮助画面读起来像地形图 */}
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="0.7"
            className="text-line-strong/60"
          >
            <path d="M -20 152 C 50 128 112 160 180 132 S 280 104 340 120" />
            <path d="M -20 128 C 40 104 118 136 186 108 S 280 80 340 96" />
            <path d="M -20 104 C 50 80 110 110 180 84 S 280 56 340 72" />
            <path d="M -20 80 C 50 56 110 86 180 60 S 280 32 340 48" />
            <path d="M -20 56 C 50 32 110 62 180 36 S 280 8 340 24" />
          </g>

          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
            strokeDasharray="2 7"
            className="text-line"
          >
            <path d="M 80 0 V 180 M 160 0 V 180 M 240 0 V 180" />
            <path d="M 0 45 H 320 M 0 90 H 320 M 0 135 H 320" />
          </g>

          {/* 路线：先铺一层宽的淡色底，再压一条实线，深色背景上更清楚 */}
          <path
            d={map.path}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.2"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d={map.path}
            fill="none"
            stroke="currentColor"
            strokeWidth={compact ? 2 : 2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {map.points.map((point, index) => (
            <MapMarker key={`${point.label}-${index}`} point={point} index={index} compact={compact} />
          ))}

          <g transform="translate(296 20)" className="text-ink-faint">
            <path d="M 0 6 L 3 -5 L 6 6 L 3 3 Z" fill="currentColor" />
            <text
              y="-8"
              textAnchor="middle"
              className="fill-current font-mono text-[7px] tracking-[0.08em]"
            >
              N
            </text>
          </g>
        </svg>

        <span className="absolute bottom-1.5 right-2 rounded-[3px] bg-canvas/75 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-ink-faint">
          示意 · 非导航
        </span>
      </div>

      {!compact ? (
        <figcaption className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-dashed border-line px-3 py-2">
          <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
            Route
          </span>
          {map.points.map((point, index) => (
            <span
              key={`${point.label}-legend-${index}`}
              className="inline-flex items-center gap-1 text-[10px] text-ink-muted"
            >
              <span className="grid size-4 shrink-0 place-items-center rounded-full border border-tone-3/50 bg-surface font-mono text-[8px] font-bold text-tone-3">
                {index + 1}
              </span>
              <span className="truncate">{point.label}</span>
              {index < map.points.length - 1 ? (
                <span aria-hidden="true" className="text-ink-faint">
                  →
                </span>
              ) : null}
            </span>
          ))}
        </figcaption>
      ) : null}

      {elevation ? (
        <div className="border-t border-dashed border-line px-3 pb-2.5 pt-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-faint">
              Elevation
            </span>
            <span className="font-mono text-[9px] tabular-nums text-ink-muted">
              {elevation.min.toLocaleString('en-US')}–{elevation.max.toLocaleString('en-US')} m
            </span>
          </div>
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            role="img"
            aria-label="海拔剖面示意图"
            className="mt-1 h-14 w-full text-tone-3"
          >
            <polygon points={elevation.area} className="fill-tone-3/12" />
            <polyline
              points={elevation.line}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {elevation.dots.map((dot, index) => (
              <circle
                key={`elevation-dot-${index}`}
                cx={dot.x}
                cy={dot.y}
                r="1.8"
                className="fill-tone-3"
              />
            ))}
          </svg>
          <div className="mt-1 flex justify-between gap-1 overflow-hidden font-mono text-[8px] text-ink-faint">
            {map.elevation.map((point) => (
              <span key={point.label} className="truncate">
                {point.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </figure>
  );
}
