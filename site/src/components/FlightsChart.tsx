import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { scaleBand, scaleLinear } from '@visx/scale';
import { Bar } from '@visx/shape';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { localPoint } from '@visx/event';
import { useParentSize } from '@visx/responsive';
import { TooltipWithBounds } from '@visx/tooltip';
import { calDate } from '../lib/dates';
import { groupInt } from '../lib/client';

export interface FlightBar {
  n: number;
  date: string;
  hover: boolean;
  dist_m: number;
  max_alt_m: number;
  duration_s: number;
}

interface Props {
  flights: FlightBar[];
  picked: number;
  onPick: (n: number) => void;
}

const MARGIN = { top: 8, right: 10, bottom: 38, left: 62 };
const GAP = 22;
const TICK = { fill: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12.5 } as const;

function Plot({ width, height, flights, picked, onPick }: Props & { width: number; height: number }) {
  const liveId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 60);
  const panelH = Math.max((height - MARGIN.top - MARGIN.bottom - GAP) / 2, 40);

  const x = useMemo(() => scaleBand<number>({ domain: flights.map((f) => f.n), range: [0, innerW], paddingInner: 0.22, paddingOuter: 0.1 }), [flights, innerW]);
  const yDist = useMemo(() => scaleLinear<number>({ domain: [0, Math.max(...flights.map((f) => f.dist_m))], range: [panelH, 0], nice: true }), [flights, panelH]);
  const yAlt = useMemo(() => scaleLinear<number>({ domain: [0, Math.max(...flights.map((f) => f.max_alt_m))], range: [panelH, 0], nice: true }), [flights, panelH]);

  const step = x.step();
  const bw = x.bandwidth();
  const radius = Math.min(4, bw / 2);
  const shown = hover ?? null;
  const tipFlight = shown ? flights[shown - 1] : null;

  const toFlight = (e: PointerEvent<SVGRectElement>) => {
    const pt = localPoint(e);
    if (!pt) return null;
    const i = Math.floor((pt.x - MARGIN.left - x.paddingOuter() * step) / step);
    return Math.min(flights.length, Math.max(1, i + 1));
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const jump = e.shiftKey ? 10 : 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = picked + jump;
    else if (e.key === 'ArrowLeft') next = picked - jump;
    else if (e.key === 'Home') next = 1;
    else if (e.key === 'End') next = flights.length;
    if (next === null) return;
    e.preventDefault();
    onPick(Math.min(flights.length, Math.max(1, next)));
  };

  const ticks = flights.filter((f) => f.n === 1 || f.n % (innerW < 420 ? 20 : 10) === 0).map((f) => f.n);
  const bar = (f: FlightBar, value: number, y: (v: number) => number, top: number) => {
    const h = Math.max(panelH - y(value), f.hover && value === 0 ? 0 : 1.5);
    const on = f.n === picked;
    return (
      <Bar
        key={f.n}
        x={x(f.n)}
        y={top + panelH - h}
        width={bw}
        height={h}
        rx={radius}
        fill={on ? 'var(--lilac)' : f.n === hover ? 'var(--muted)' : 'var(--chart-quiet)'}
      />
    );
  };

  const tipX = tipFlight ? MARGIN.left + (x(tipFlight.n) ?? 0) + bw / 2 : 0;
  const live = `Flight ${picked} picked.`;

  return (
    <div
      className="hl-chart"
      tabIndex={0}
      role="group"
      aria-label="Distance and highest altitude of each of Ingenuity's 72 flights from NASA's flight log. Arrow keys pick the flight, Shift moves 10 flights."
      aria-describedby={liveId}
      onKeyDown={onKey}
    >
      <svg width={width} height={height} role="presentation">
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows scale={yDist} width={innerW} numTicks={3} stroke="var(--rule)" strokeWidth={1} />
          <AxisLeft
            scale={yDist}
            numTicks={3}
            tickFormat={(v) => groupInt(Number(v))}
            hideAxisLine
            hideTicks
            tickLabelProps={() => ({ ...TICK, textAnchor: 'end', dx: -6, dy: 4 })}
            label="Distance, m"
            labelOffset={40}
            labelProps={{ ...TICK, textAnchor: 'middle' }}
          />
          {flights.map((f) => bar(f, f.dist_m, yDist, 0))}
          <Group top={panelH + GAP}>
            <GridRows scale={yAlt} width={innerW} numTicks={3} stroke="var(--rule)" strokeWidth={1} />
            <AxisLeft
              scale={yAlt}
              numTicks={3}
              hideAxisLine
              hideTicks
              tickLabelProps={() => ({ ...TICK, textAnchor: 'end', dx: -6, dy: 4 })}
              label="Height, m"
              labelOffset={40}
              labelProps={{ ...TICK, textAnchor: 'middle' }}
            />
            {flights.map((f) => bar(f, f.max_alt_m, yAlt, 0))}
            <AxisBottom
              top={panelH}
              scale={x}
              tickValues={ticks}
              stroke="var(--edge)"
              tickStroke="var(--edge)"
              tickLength={4}
              tickLabelProps={() => ({ ...TICK, textAnchor: 'middle', dy: 2 })}
              label="Flight"
              labelOffset={10}
              labelProps={{ ...TICK, textAnchor: 'middle' }}
            />
          </Group>
          <rect
            width={innerW}
            height={panelH * 2 + GAP}
            fill="transparent"
            style={{ touchAction: 'pan-y', cursor: 'pointer' }}
            onPointerMove={(e) => setHover(toFlight(e))}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
            onPointerDown={(e) => {
              const f = toFlight(e);
              if (f) {
                setHover(f);
                onPick(f);
              }
            }}
          />
        </Group>
      </svg>
      {tipFlight && (
        <TooltipWithBounds left={tipX} top={MARGIN.top + 8} offsetLeft={12} offsetTop={0} unstyled className="hl-tip">
          <div className="hl-tip-x">
            Flight {tipFlight.n}, {calDate(tipFlight.date)}
          </div>
          <div className="hl-tip-row on">
            <span className="hl-tip-key" aria-hidden="true" />
            <span className="hl-tip-v">{tipFlight.hover ? 'Hover' : `${groupInt(tipFlight.dist_m)} m`}</span>
            <span className="hl-tip-n">distance</span>
          </div>
          <div className="hl-tip-row on">
            <span className="hl-tip-key" aria-hidden="true" />
            <span className="hl-tip-v">{tipFlight.max_alt_m} m</span>
            <span className="hl-tip-n">height</span>
          </div>
          <div className="hl-tip-row">
            <span className="hl-tip-key" aria-hidden="true" />
            <span className="hl-tip-v">{tipFlight.duration_s.toFixed(1)} s</span>
            <span className="hl-tip-n">in the air</span>
          </div>
        </TooltipWithBounds>
      )}
      <p id={liveId} className="sr-only" aria-live="polite" data-chart-text="">
        {live}
      </p>
    </div>
  );
}

export default function FlightsChart(props: Props) {
  const { parentRef, width, height } = useParentSize({ debounceTime: 60 });
  return (
    <div ref={parentRef} className="hl-chart-box">
      {width > 0 && height > 0 && <Plot width={width} height={height} {...props} />}
    </div>
  );
}
