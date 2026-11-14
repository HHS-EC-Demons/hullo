import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { scaleLinear } from '@visx/scale';
import { LinePath, Line } from '@visx/shape';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { localPoint } from '@visx/event';
import { useParentSize } from '@visx/responsive';
import { TooltipWithBounds } from '@visx/tooltip';
import { curveMonotoneX } from '@visx/curve';
import { bisector } from '@visx/vendor/d3-array';
import { cn } from '@/lib/utils';

export interface LinePoint {
  x: number;
  y: number;
}

export interface LineSeries {
  key: string;
  label: string;
  points: LinePoint[];
}

export interface RefLine {
  y: number;
  label: string;
}

export interface Mark {
  x: number;
  y: number;
  label: string;
  below?: boolean;
}

export interface LineChartProps {
  series: LineSeries[];
  label: string;
  xTitle: string;
  yTitle: string;
  tickX: (x: number) => string;
  tickY: (y: number) => string;
  readX: (x: number) => string;
  readY: (y: number) => string;
  xDomain?: [number, number];
  yDomain?: [number, number];
  xTicks?: number;
  yTicks?: number;
  picked?: string;
  onPick?: (key: string) => void;
  endLabels?: boolean;
  refLines?: RefLine[];
  marks?: Mark[];
  xTickValues?: number[];
  className?: string;
}

const MARGIN = { top: 14, right: 18, bottom: 46 };
const TICK_CHAR = 7.7;
const LABEL_GAP = 17;
const PICK_PX = 28;
const byX = bisector<LinePoint, number>((p) => p.x).center;

const TICK = {
  fill: 'var(--muted)',
  fontFamily: 'var(--mono)',
  fontSize: 12.5,
} as const;

function nearest(points: LinePoint[], x: number): LinePoint | null {
  if (!points.length) return null;
  if (x < points[0].x || x > points[points.length - 1].x) return null;
  return points[byX(points, x)];
}

function spread(items: { key: string; y: number }[], lo: number, hi: number): Map<string, number> {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const pos = sorted.map((s) => s.y);
  for (let pass = 0; pass < 40; pass++) {
    let moved = false;
    for (let i = 1; i < pos.length; i++) {
      const gap = pos[i] - pos[i - 1];
      if (gap < LABEL_GAP) {
        const push = (LABEL_GAP - gap) / 2;
        pos[i - 1] -= push;
        pos[i] += push;
        moved = true;
      }
    }
    for (let i = 0; i < pos.length; i++) pos[i] = Math.min(Math.max(pos[i], lo), hi);
    if (!moved) break;
  }
  return new Map(sorted.map((s, i) => [s.key, pos[i]]));
}

function Plot({
  width,
  height,
  series,
  label,
  xTitle,
  yTitle,
  tickX,
  tickY,
  readX,
  readY,
  xDomain,
  yDomain,
  xTicks = 6,
  yTicks = 5,
  picked,
  onPick,
  endLabels,
  refLines = [],
  marks = [],
  xTickValues,
}: LineChartProps & { width: number; height: number }) {
  const liveId = useId();
  const [cursor, setCursor] = useState<number | null>(null);

  const all = useMemo(() => series.flatMap((s) => s.points), [series]);
  const xs = xDomain ?? [Math.min(...all.map((p) => p.x)), Math.max(...all.map((p) => p.x))];
  const ys = yDomain ?? [0, Math.max(...all.map((p) => p.y))];

  const labelRoom = endLabels ? Math.min(118, Math.max(84, width * 0.12)) : 0;
  const innerH = Math.max(height - MARGIN.top - MARGIN.bottom, 40);
  const y = useMemo(() => scaleLinear<number>({ domain: ys, range: [innerH, 0], nice: !yDomain }), [ys[0], ys[1], innerH, yDomain]);
  const tickChars = Math.max(2, ...y.ticks(yTicks).map((v) => tickY(Number(v)).length));
  const left = Math.round(tickChars * TICK_CHAR + 34);
  const innerW = Math.max(width - left - MARGIN.right - labelRoom, 40);
  const x = useMemo(() => scaleLinear<number>({ domain: xs, range: [0, innerW] }), [xs[0], xs[1], innerW]);

  const lead = series.find((s) => s.key === picked) ?? series[0];
  const ordered = useMemo(() => [...series.filter((s) => s.key !== lead?.key), ...(lead ? [lead] : [])], [series, lead]);

  const readouts = useMemo(() => {
    if (cursor === null) return [];
    return series
      .map((s) => ({ s, p: nearest(s.points, cursor) }))
      .filter((r): r is { s: LineSeries; p: LinePoint } => r.p !== null)
      .sort((a, b) => (a.s.key === lead?.key ? -1 : b.s.key === lead?.key ? 1 : b.p.y - a.p.y));
  }, [cursor, series, lead]);

  const snapX = readouts.find((r) => r.s.key === lead?.key)?.p.x ?? readouts[0]?.p.x ?? cursor;

  const place = (xv: number) => setCursor(xv);
  const tipLeft = left + (snapX === null ? 0 : x(snapX));
  const tipTop = MARGIN.top + (readouts.length ? Math.min(Math.max(y(readouts[0].p.y), 0), innerH) : innerH / 2);

  const toValue = (e: PointerEvent<SVGRectElement>) => {
    const pt = localPoint(e);
    if (!pt) return null;
    return { xv: x.invert(Math.min(Math.max(pt.x - left, 0), innerW)), py: pt.y - MARGIN.top };
  };

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const v = toValue(e);
    if (v) place(v.xv);
  };

  const onDown = (e: PointerEvent<SVGRectElement>) => {
    const v = toValue(e);
    if (!v) return;
    place(v.xv);
    if (!onPick) return;
    let best: { key: string; d: number } | null = null;
    for (const s of series) {
      const p = nearest(s.points, v.xv);
      if (!p) continue;
      const d = Math.abs(y(p.y) - v.py);
      if (d <= PICK_PX && (!best || d < best.d)) best = { key: s.key, d };
    }
    if (best) onPick(best.key);
  };

  const onLeave = (e: PointerEvent<SVGRectElement>) => {
    if (e.pointerType !== 'mouse') return;
    setCursor(null);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!lead) return;
    const pts = lead.points;
    const at = cursor === null ? pts.length - 1 : byX(pts, cursor);
    const step = e.shiftKey ? 10 : 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = Math.min(at + step, pts.length - 1);
    else if (e.key === 'ArrowLeft') next = Math.max(at - step, 0);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = pts.length - 1;
    else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && onPick && series.length > 1) {
      const i = series.findIndex((s) => s.key === lead.key);
      const j = (i + (e.key === 'ArrowDown' ? 1 : -1) + series.length) % series.length;
      onPick(series[j].key);
      e.preventDefault();
      return;
    }
    if (next === null) return;
    e.preventDefault();
    place(pts[next].x);
  };

  const ends = useMemo(() => {
    if (!endLabels) return new Map<string, number>();
    return spread(
      series.filter((s) => s.points.length).map((s) => ({ key: s.key, y: y(s.points[s.points.length - 1].y) })),
      6,
      innerH - 6,
    );
  }, [endLabels, series, y, innerH]);

  const live = readouts.length ? `${readX(snapX ?? 0)}. ${readouts.map((r) => `${r.s.label} ${readY(r.p.y)}`).join(', ')}` : '';

  return (
    <div
      className="hl-chart"
      tabIndex={0}
      role="group"
      aria-label={`${label}. Arrow keys move along the line${onPick && series.length > 1 ? ', up and down pick a line' : ''}.`}
      aria-describedby={liveId}
      onKeyDown={onKey}
      onFocus={() => cursor === null && lead && place(lead.points[lead.points.length - 1].x)}
    >
      <svg width={width} height={height} role="presentation">
        <Group left={left} top={MARGIN.top}>
          <GridRows scale={y} width={innerW} numTicks={yTicks} stroke="var(--rule)" strokeWidth={1} />
          {refLines.map((r) => (
            <g key={r.label}>
              <Line from={{ x: 0, y: y(r.y) }} to={{ x: innerW, y: y(r.y) }} stroke="var(--muted)" strokeWidth={1} strokeOpacity={0.7} />
              <text x={innerW - 4} y={y(r.y) - 7} {...TICK} fill="var(--text)" textAnchor="end">
                {r.label}
              </text>
            </g>
          ))}
          <AxisLeft
            scale={y}
            numTicks={yTicks}
            tickFormat={(v) => tickY(Number(v))}
            stroke="var(--rule)"
            tickStroke="var(--rule)"
            hideAxisLine
            hideTicks
            tickLabelProps={() => ({ ...TICK, textAnchor: 'end', dx: -6, dy: 4 })}
            label={yTitle}
            labelOffset={Math.round(tickChars * TICK_CHAR + 8)}
            labelProps={{ ...TICK, fill: 'var(--muted)', textAnchor: 'middle' }}
          />
          <AxisBottom
            top={innerH}
            scale={x}
            numTicks={Math.min(xTicks, Math.max(2, Math.floor(innerW / 76)))}
            tickValues={xTickValues?.filter((_, i, all) => all.length * 64 <= innerW || i % Math.ceil((all.length * 64) / innerW) === 0)}
            tickFormat={(v) => tickX(Number(v))}
            stroke="var(--edge)"
            tickStroke="var(--edge)"
            tickLength={5}
            tickLabelProps={() => ({ ...TICK, textAnchor: 'middle', dy: 2 })}
            label={xTitle}
            labelOffset={14}
            labelProps={{ ...TICK, fill: 'var(--muted)', textAnchor: 'middle' }}
          />
          {ordered.map((s) => {
            const on = s.key === lead?.key;
            return (
              <LinePath
                key={s.key}
                data={s.points}
                x={(p) => x(p.x)}
                y={(p) => y(p.y)}
                curve={curveMonotoneX}
                stroke={on ? 'var(--lilac)' : 'var(--chart-quiet)'}
                strokeWidth={on ? 2.5 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            );
          })}
          {endLabels &&
            series.map((s) => {
              const last = s.points[s.points.length - 1];
              if (!last) return null;
              const ly = ends.get(s.key) ?? y(last.y);
              const on = s.key === lead?.key;
              return (
                <g key={s.key}>
                  <Line from={{ x: x(last.x) + 3, y: y(last.y) }} to={{ x: innerW + 10, y: ly }} stroke="var(--rule)" strokeWidth={1} />
                  <text x={innerW + 14} y={ly + 4} fontFamily="var(--sans)" fontSize={13} fontWeight={on ? 700 : 400} fill={on ? 'var(--text)' : 'var(--muted)'}>
                    {s.label}
                  </text>
                </g>
              );
            })}
          {marks.map((m) => (
            <g key={m.label} pointerEvents="none">
              <circle cx={x(m.x)} cy={y(m.y)} r={4.5} fill="var(--text)" stroke="var(--bg)" strokeWidth={2} />
              <text
                x={Math.min(Math.max(x(m.x), 40), innerW - 40)}
                y={y(m.y) + (m.below ? 22 : -12)}
                textAnchor="middle"
                fontFamily="var(--sans)"
                fontSize={13}
                fontWeight={700}
                fill="var(--text)"
              >
                {m.label}
              </text>
            </g>
          ))}
          {cursor !== null && snapX !== null && (
            <g pointerEvents="none">
              <Line from={{ x: x(snapX), y: 0 }} to={{ x: x(snapX), y: innerH }} stroke="var(--muted)" strokeWidth={1} />
              {readouts.map((r) => (
                <circle
                  key={r.s.key}
                  cx={x(r.p.x)}
                  cy={y(r.p.y)}
                  r={4.5}
                  fill={r.s.key === lead?.key ? 'var(--lilac)' : 'var(--chart-quiet)'}
                  stroke="var(--bg)"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}
          <rect
            width={innerW + labelRoom}
            height={innerH}
            fill="transparent"
            style={{ touchAction: 'pan-y', cursor: onPick ? 'pointer' : 'crosshair' }}
            onPointerMove={onMove}
            onPointerDown={onDown}
            onPointerLeave={onLeave}
          />
        </Group>
      </svg>
      {cursor !== null && readouts.length > 0 && (
        <TooltipWithBounds left={tipLeft} top={tipTop} offsetLeft={14} offsetTop={-12} unstyled className="hl-tip">
          <div className="hl-tip-x">{readX(snapX ?? 0)}</div>
          {readouts.map((r) => (
            <div key={r.s.key} className={cn('hl-tip-row', r.s.key === lead?.key && 'on')}>
              <span className="hl-tip-key" aria-hidden="true" />
              <span className="hl-tip-v">{readY(r.p.y)}</span>
              <span className="hl-tip-n">{r.s.label}</span>
            </div>
          ))}
        </TooltipWithBounds>
      )}
      <p id={liveId} className="sr-only" aria-live="polite">
        {live}
      </p>
    </div>
  );
}

export default function LineChart({ className, ...props }: LineChartProps) {
  const { parentRef, width, height } = useParentSize({ debounceTime: 60 });
  return (
    <div ref={parentRef} className={cn('hl-chart-box', className)}>
      {width > 0 && height > 0 && <Plot width={width} height={height} {...props} />}
    </div>
  );
}
