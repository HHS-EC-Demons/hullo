import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { scaleLinear } from '@visx/scale';
import { Line, LinePath } from '@visx/shape';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { localPoint } from '@visx/event';
import { useParentSize } from '@visx/responsive';
import { TooltipWithBounds } from '@visx/tooltip';
import { curveMonotoneX } from '@visx/curve';
import { C_KM_S } from '../lib/lighttime';
import { groupInt } from '../lib/client';
import { MONTHS, localStamp } from '../lib/dates';
import { shotAt, type MoonMonth } from '../lib/ranging';

interface Point {
  t: number;
  km: number;
  el: number;
}

interface Props {
  month: MoonMonth;
  station: string;
  reflector: string;
  minEl: number;
  now: number;
  label: string;
}

const MARGIN = { top: 26, right: 16, bottom: 40, left: 86 };
const DAY = 86400000;
const TICK = { fill: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12.5 } as const;

function seconds(km: number): string {
  return `${((2 * km) / C_KM_S).toFixed(4)} s`;
}

function Plot({ width, height, month, station, reflector, minEl, now, label }: Props & { width: number; height: number }) {
  const liveId = useId();
  const [at, setAt] = useState<number | null>(null);

  const points = useMemo<Point[]>(() => {
    const st = month.stations[station];
    const series = st?.refl[reflector];
    if (!series) return [];
    const t0 = Date.parse(month.start_utc);
    return series.r_m.map((r, i) => ({ t: t0 + i * month.step_s * 1000, km: r / 1000, el: st.el[i] }));
  }, [month, station, reflector]);

  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 40);
  const innerH = Math.max(height - MARGIN.top - MARGIN.bottom, 40);
  const t0 = points[0]?.t ?? 0;
  const t1 = points[points.length - 1]?.t ?? 1;
  const lo = Math.min(...points.map((p) => p.km));
  const hi = Math.max(...points.map((p) => p.km));

  const x = useMemo(() => scaleLinear<number>({ domain: [t0, t1], range: [0, innerW] }), [t0, t1, innerW]);
  const y = useMemo(() => scaleLinear<number>({ domain: [lo, hi], range: [innerH, 0], nice: true }), [lo, hi, innerH]);

  const ticks = useMemo(() => {
    const out: number[] = [];
    const first = new Date(t0);
    first.setHours(0, 0, 0, 0);
    const every = innerW < 420 ? 10 : 5;
    for (let d = new Date(first); d.getTime() <= t1; d.setDate(d.getDate() + 1)) {
      if (d.getTime() >= t0 && (d.getDate() === 1 || d.getDate() % every === 0) && d.getDate() < 30) out.push(d.getTime());
    }
    return out;
  }, [t0, t1, innerW]);

  const nowShot = now >= t0 && now <= t1 ? shotAt(month, station, reflector, now) : null;
  const nowIndex = Math.min(points.length - 1, Math.max(0, Math.round((now - t0) / (month.step_s * 1000))));
  const pick = at === null ? null : points[at];

  const move = (i: number) => setAt(Math.min(points.length - 1, Math.max(0, i)));
  const fromPointer = (e: PointerEvent<SVGRectElement>) => {
    const pt = localPoint(e);
    if (!pt) return;
    const t = x.invert(Math.min(Math.max(pt.x - MARGIN.left, 0), innerW));
    move(Math.round((t - t0) / (month.step_s * 1000)));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const base = at ?? nowIndex;
    const step = e.shiftKey ? 24 : 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = base + step;
    else if (e.key === 'ArrowLeft') next = base - step;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = points.length - 1;
    if (next === null) return;
    e.preventDefault();
    move(next);
  };

  const live = pick ? `${localStamp(pick.t, { label: false })}. ${groupInt(Math.round(pick.km))} km, round trip ${seconds(pick.km)}, Moon ${Math.round(pick.el)}° up.` : '';
  const tipLeft = pick ? MARGIN.left + x(pick.t) : 0;
  const tipTop = pick ? MARGIN.top + y(pick.km) : 0;

  return (
    <div
      className="hl-chart"
      tabIndex={0}
      role="group"
      aria-label={`${label}. Arrow keys move by the hour, Shift moves by the day.`}
      aria-describedby={liveId}
      onKeyDown={onKey}
      onFocus={() => at === null && move(nowIndex)}
    >
      <svg width={width} height={height} role="presentation">
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows scale={y} width={innerW} numTicks={5} stroke="var(--rule)" strokeWidth={1} />
          <AxisLeft
            scale={y}
            numTicks={5}
            tickFormat={(v) => groupInt(Number(v))}
            hideAxisLine
            hideTicks
            tickLabelProps={() => ({ ...TICK, textAnchor: 'end', dx: -6, dy: 4 })}
            label="Distance, km"
            labelOffset={62}
            labelProps={{ ...TICK, textAnchor: 'middle' }}
          />
          <AxisBottom
            top={innerH}
            scale={x}
            tickValues={ticks}
            tickFormat={(v) => {
              const d = new Date(Number(v));
              return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
            }}
            stroke="var(--edge)"
            tickStroke="var(--edge)"
            tickLength={5}
            tickLabelProps={() => ({ ...TICK, textAnchor: 'middle', dy: 2 })}
            label="Date"
            labelOffset={14}
            labelProps={{ ...TICK, textAnchor: 'middle' }}
          />
          <LinePath data={points} x={(p) => x(p.t)} y={(p) => y(p.km)} curve={curveMonotoneX} stroke="var(--chart-quiet)" strokeWidth={1.5} fill="none" />
          <LinePath
            data={points}
            x={(p) => x(p.t)}
            y={(p) => y(p.km)}
            defined={(p) => p.el >= minEl}
            curve={curveMonotoneX}
            stroke="var(--lilac)"
            strokeWidth={2.5}
            strokeLinecap="round"
            fill="none"
          />
          {nowShot && (
            <g pointerEvents="none">
              <Line from={{ x: x(now), y: -10 }} to={{ x: x(now), y: innerH }} stroke="var(--text)" strokeWidth={1} />
              <text x={x(now)} y={-14} {...TICK} fill="var(--text)" textAnchor="middle">
                Now
              </text>
              <circle cx={x(now)} cy={y(nowShot.range_km)} r={5.5} fill="var(--laser)" stroke="var(--bg)" strokeWidth={2} />
            </g>
          )}
          {pick && (
            <g pointerEvents="none">
              <Line from={{ x: x(pick.t), y: 0 }} to={{ x: x(pick.t), y: innerH }} stroke="var(--muted)" strokeWidth={1} />
              <circle cx={x(pick.t)} cy={y(pick.km)} r={4.5} fill={pick.el >= minEl ? 'var(--lilac)' : 'var(--chart-quiet)'} stroke="var(--bg)" strokeWidth={2} />
            </g>
          )}
          <rect
            width={innerW}
            height={innerH}
            fill="transparent"
            style={{ touchAction: 'pan-y', cursor: 'crosshair' }}
            onPointerMove={fromPointer}
            onPointerDown={fromPointer}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setAt(null)}
          />
        </Group>
      </svg>
      {pick && (
        <TooltipWithBounds left={tipLeft} top={tipTop} offsetLeft={14} offsetTop={-12} unstyled className="hl-tip">
          <div className="hl-tip-x">{localStamp(pick.t, { label: false })}</div>
          <div className="hl-tip-row on">
            <span className="hl-tip-key" aria-hidden="true" />
            <span className="hl-tip-v">{groupInt(Math.round(pick.km))} km</span>
            <span className="hl-tip-n">range</span>
          </div>
          <div className="hl-tip-row on">
            <span className="hl-tip-key" aria-hidden="true" />
            <span className="hl-tip-v">{seconds(pick.km)}</span>
            <span className="hl-tip-n">round trip</span>
          </div>
          <div className="hl-tip-row">
            <span className="hl-tip-key" aria-hidden="true" />
            <span className="hl-tip-v">{Math.round(pick.el)}°</span>
            <span className="hl-tip-n">{pick.el < 0 ? 'Moon set' : 'Moon up'}</span>
          </div>
        </TooltipWithBounds>
      )}
      <p id={liveId} className="sr-only" aria-live="polite" data-chart-text="">
        {live}
      </p>
    </div>
  );
}

export default function MoonRangeChart(props: Props) {
  const { parentRef, width, height } = useParentSize({ debounceTime: 60 });
  return (
    <div className="mc">
      <div ref={parentRef} className="hl-chart-box mc-plot">
        {width > 0 && height > 0 && <Plot width={width} height={height} {...props} />}
      </div>
      <p className="mc-legend" aria-hidden="true" data-chart-text="">
        <span className="mc-key mc-key-on" />
        Laser can fire
        <span className="mc-key mc-key-off" />
        Moon low
      </p>
    </div>
  );
}
