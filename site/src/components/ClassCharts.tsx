import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { scaleLinear } from '@visx/scale';
import { Line, LinePath } from '@visx/shape';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { localPoint } from '@visx/event';
import { useParentSize } from '@visx/responsive';
import { TooltipWithBounds } from '@visx/tooltip';
import { bisector } from '@visx/vendor/d3-array';
import type { Flight } from './Worksheets';

const TIP_STYLE = { position: 'absolute', pointerEvents: 'none' } as const;
const TICK = { fill: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12.5 } as const;
const MARGIN = { top: 14, right: 16, bottom: 44, left: 72 };

export interface Point {
  x: number;
  y: number;
}

export interface SeriesChartProps {
  points: Point[];
  marker: Point | null;
  refY?: { y: number; label: string };
  label: string;
  xTitle: string;
  yTitle: string;
  tickX: (x: number) => string;
  tickY: (y: number) => string;
  readX: (x: number) => string;
  readY: (y: number) => string;
  xTickValues: (lo: number, hi: number, width: number) => number[];
}

const byX = bisector<Point, number>((p) => p.x).center;

function useBox() {
  const { parentRef, width, height } = useParentSize({ debounceTime: 60 });
  return { parentRef, width, height, ready: width > 0 && height > 0 };
}

function SeriesPlot({ points, marker, refY, label, xTitle, yTitle, tickX, tickY, readX, readY, xTickValues, width, height }: SeriesChartProps & { width: number; height: number }) {
  const liveId = useId();
  const [at, setAt] = useState<number | null>(null);
  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 40);
  const innerH = Math.max(height - MARGIN.top - MARGIN.bottom, 40);
  const lo = points[0].x;
  const hi = points[points.length - 1].x;
  const ys = points.map((p) => p.y);
  const yLo = Math.min(...ys, refY?.y ?? Infinity);
  const yHi = Math.max(...ys, refY?.y ?? -Infinity);
  const pad = (yHi - yLo) * 0.08 || 1;

  const x = useMemo(() => scaleLinear<number>({ domain: [lo, hi], range: [0, innerW] }), [lo, hi, innerW]);
  const y = useMemo(() => scaleLinear<number>({ domain: [yLo - pad, yHi + pad], range: [innerH, 0], nice: true }), [yLo, yHi, pad, innerH]);
  const xTicks = useMemo(() => xTickValues(lo, hi, innerW), [xTickValues, lo, hi, innerW]);
  const markerIndex = marker ? byX(points, marker.x) : points.length - 1;

  const shown = at === null ? null : points[at];

  const fromPointer = (e: PointerEvent<SVGRectElement>) => {
    const pt = localPoint(e);
    if (!pt) return null;
    return byX(points, x.invert(Math.min(Math.max(pt.x - MARGIN.left, 0), innerW)));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = at ?? markerIndex;
    const jump = e.shiftKey ? 24 : 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = Math.min(i + jump, points.length - 1);
    else if (e.key === 'ArrowLeft') next = Math.max(i - jump, 0);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = points.length - 1;
    if (next === null) return;
    e.preventDefault();
    setAt(next);
  };

  return (
    <div
      className="hl-chart"
      tabIndex={0}
      role="group"
      aria-label={`${label}. Arrow keys move along the line, Shift moves faster.`}
      aria-describedby={liveId}
      onKeyDown={onKey}
      onFocus={() => at === null && setAt(markerIndex)}
      data-tick
    >
      <svg width={width} height={height} role="presentation">
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows scale={y} width={innerW} numTicks={4} stroke="var(--rule)" strokeWidth={1} />
          {refY && (
            <g>
              <Line from={{ x: 0, y: y(refY.y) }} to={{ x: innerW, y: y(refY.y) }} stroke="var(--muted)" strokeWidth={1} />
              <text x={6} y={y(refY.y) - 7} {...TICK} fill="var(--text)">
                {refY.label}
              </text>
            </g>
          )}
          <AxisLeft
            scale={y}
            numTicks={4}
            tickFormat={(v) => tickY(Number(v))}
            hideAxisLine
            hideTicks
            tickLabelProps={() => ({ ...TICK, textAnchor: 'end', dx: -6, dy: 4 })}
            label={yTitle}
            labelOffset={48}
            labelProps={{ ...TICK, textAnchor: 'middle' }}
          />
          <AxisBottom
            top={innerH}
            scale={x}
            tickValues={xTicks}
            tickFormat={(v) => tickX(Number(v))}
            stroke="var(--edge)"
            tickStroke="var(--edge)"
            tickLength={5}
            tickLabelProps={() => ({ ...TICK, textAnchor: 'middle', dy: 2 })}
            label={xTitle}
            labelOffset={14}
            labelProps={{ ...TICK, textAnchor: 'middle' }}
          />
          <LinePath data={points} x={(p) => x(p.x)} y={(p) => y(p.y)} stroke="var(--line)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" fill="none" />
          {marker && <circle cx={x(marker.x)} cy={y(marker.y)} r={5} fill="var(--laser)" stroke="var(--bg)" strokeWidth={2} />}
          {shown && (
            <g pointerEvents="none">
              <Line from={{ x: x(shown.x), y: 0 }} to={{ x: x(shown.x), y: innerH }} stroke="var(--muted)" strokeWidth={1} />
              <circle cx={x(shown.x)} cy={y(shown.y)} r={4.5} fill="var(--line)" stroke="var(--bg)" strokeWidth={2} />
            </g>
          )}
          <rect
            width={innerW}
            height={innerH}
            fill="transparent"
            style={{ touchAction: 'pan-y', cursor: 'crosshair' }}
            onPointerMove={(e) => {
              const i = fromPointer(e);
              if (i !== null) setAt(i);
            }}
            onPointerDown={(e) => {
              const i = fromPointer(e);
              if (i !== null) setAt(i);
            }}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setAt(null)}
          />
        </Group>
      </svg>
      {shown && (
        <TooltipWithBounds left={MARGIN.left + x(shown.x)} top={MARGIN.top + y(shown.y)} offsetLeft={14} offsetTop={-12} style={TIP_STYLE} className="hl-tip">
          <div className="hl-tip-x">{readX(shown.x)}</div>
          <div className="hl-tip-row on">
            <span className="hl-tip-key" aria-hidden="true" />
            <span className="hl-tip-v">{readY(shown.y)}</span>
          </div>
        </TooltipWithBounds>
      )}
      <p id={liveId} className="sr-only" aria-live="polite">
        {shown ? `${readX(shown.x)}, ${readY(shown.y)}` : ''}
      </p>
    </div>
  );
}

export function SeriesChart(props: SeriesChartProps) {
  const { parentRef, width, height, ready } = useBox();
  return (
    <div ref={parentRef} className="hl-chart-box">
      {ready && props.points.length > 1 && <SeriesPlot {...props} width={width} height={height} />}
    </div>
  );
}

export interface FlightChartProps {
  flights: Flight[];
  picked: number;
  onPick: (n: number) => void;
  readDist: (m: number) => string;
  readTime: (s: number) => string;
}

const HIT_PX = 26;

function FlightPlot({ flights, picked, onPick, readDist, readTime, width, height }: FlightChartProps & { width: number; height: number }) {
  const liveId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 40);
  const innerH = Math.max(height - MARGIN.top - MARGIN.bottom, 40);
  const maxT = Math.max(...flights.map((f) => f.duration_s as number));
  const maxD = Math.max(...flights.map((f) => f.dist_m as number));
  const x = useMemo(() => scaleLinear<number>({ domain: [0, maxT], range: [0, innerW], nice: true }), [maxT, innerW]);
  const y = useMemo(() => scaleLinear<number>({ domain: [0, maxD], range: [innerH, 0], nice: true }), [maxD, innerH]);

  const [focused, setFocused] = useState(false);
  const pickedFlight = flights.find((f) => f.n === picked) ?? flights[0];
  const shown = hover !== null ? flights.find((f) => f.n === hover) ?? null : focused ? pickedFlight : null;
  const order = useMemo(() => [...flights.filter((f) => f.n !== picked), ...flights.filter((f) => f.n === picked)], [flights, picked]);

  const near = (e: PointerEvent<SVGRectElement>) => {
    const pt = localPoint(e);
    if (!pt) return null;
    let best: { n: number; d: number } | null = null;
    for (const f of flights) {
      const d = Math.hypot(x(f.duration_s as number) - (pt.x - MARGIN.left), y(f.dist_m as number) - (pt.y - MARGIN.top));
      if (d <= HIT_PX && (!best || d < best.d)) best = { n: f.n, d };
    }
    return best?.n ?? null;
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = flights.findIndex((f) => f.n === picked);
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(i + 1, flights.length - 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(i - 1, 0);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = flights.length - 1;
    if (next === null) return;
    e.preventDefault();
    onPick(flights[next].n);
  };

  return (
    <div
      className="hl-chart"
      tabIndex={0}
      role="group"
      aria-label="Distance and time of each Ingenuity flight. Arrow keys pick the next or previous flight."
      aria-describedby={liveId}
      onKeyDown={onKey}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      data-tick
    >
      <svg width={width} height={height} role="presentation">
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows scale={y} width={innerW} numTicks={4} stroke="var(--rule)" strokeWidth={1} />
          <AxisLeft
            scale={y}
            numTicks={4}
            tickFormat={(v) => String(v)}
            hideAxisLine
            hideTicks
            tickLabelProps={() => ({ ...TICK, textAnchor: 'end', dx: -6, dy: 4 })}
            label="distance, m"
            labelOffset={48}
            labelProps={{ ...TICK, textAnchor: 'middle' }}
          />
          <AxisBottom
            top={innerH}
            scale={x}
            numTicks={Math.max(2, Math.min(6, Math.floor(innerW / 70)))}
            tickFormat={(v) => String(v)}
            stroke="var(--edge)"
            tickStroke="var(--edge)"
            tickLength={5}
            tickLabelProps={() => ({ ...TICK, textAnchor: 'middle', dy: 2 })}
            label="time in air, s"
            labelOffset={14}
            labelProps={{ ...TICK, textAnchor: 'middle' }}
          />
          {order.map((f) => {
            const on = f.n === picked;
            const over = f.n === hover;
            return (
              <circle
                key={f.n}
                cx={x(f.duration_s as number)}
                cy={y(f.dist_m as number)}
                r={on ? 6.5 : over ? 5.5 : 4}
                fill={on ? 'var(--laser)' : over ? 'var(--line)' : 'var(--chart-quiet)'}
                stroke="var(--bg)"
                strokeWidth={2}
                pointerEvents="none"
              />
            );
          })}
          <rect
            width={innerW}
            height={innerH}
            fill="transparent"
            style={{ touchAction: 'pan-y', cursor: 'pointer' }}
            onPointerMove={(e) => setHover(near(e))}
            onPointerDown={(e) => {
              const n = near(e);
              if (n !== null) onPick(n);
            }}
            onPointerLeave={() => setHover(null)}
          />
        </Group>
      </svg>
      {shown && (
        <TooltipWithBounds left={MARGIN.left + x(shown.duration_s as number)} top={MARGIN.top + y(shown.dist_m as number)} offsetLeft={14} offsetTop={-12} style={TIP_STYLE} className="hl-tip">
          <div className="hl-tip-x">Flight {shown.n}</div>
          <div className="hl-tip-row on">
            <span className="hl-tip-key" aria-hidden="true" />
            <span className="hl-tip-v">{readDist(shown.dist_m as number)}</span>
            <span className="hl-tip-n">in {readTime(shown.duration_s as number)}</span>
          </div>
        </TooltipWithBounds>
      )}
      <p id={liveId} className="sr-only" aria-live="polite">
        {`Flight ${pickedFlight.n}, ${readDist(pickedFlight.dist_m as number)} in ${readTime(pickedFlight.duration_s as number)}`}
      </p>
    </div>
  );
}

export function FlightChart(props: FlightChartProps) {
  const { parentRef, width, height, ready } = useBox();
  return (
    <div ref={parentRef} className="hl-chart-box">
      {ready && props.flights.length > 0 && <FlightPlot {...props} width={width} height={height} />}
    </div>
  );
}
