import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { scaleLinear, scaleTime } from '@visx/scale';
import { AreaClosed, Line, LinePath } from '@visx/shape';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { localPoint } from '@visx/event';
import { useParentSize } from '@visx/responsive';
import { TooltipWithBounds } from '@visx/tooltip';
import { curveStepAfter } from '@visx/curve';
import { quietSteps, type QuietEvent } from '../lib/quiet-count';
import { pickQuiet } from '../lib/quiet-pick';
import { calDate } from '../lib/dates';

interface Props {
  events: QuietEvent[];
  nowMs: number;
}

const MARGIN = { top: 26, right: 14, bottom: 46, left: 30 };
const TIP_STYLE = { position: 'absolute', pointerEvents: 'none' } as const;
const TICK = { fill: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12.5 } as const;

function nearest(events: QuietEvent[], ms: number): number {
  let best = 0;
  for (let i = 1; i < events.length; i++) if (Math.abs(events[i].ms - ms) < Math.abs(events[best].ms - ms)) best = i;
  return best;
}

function Plot({ events, nowMs, width, height }: Props & { width: number; height: number }) {
  const tipId = useId();
  const [at, setAt] = useState<number | null>(null);
  const steps = useMemo(() => quietSteps(events, nowMs), [events, nowMs]);
  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 40);
  const innerH = Math.max(height - MARGIN.top - MARGIN.bottom, 40);
  const top = Math.max(...steps.map((s) => s.count));

  const x = useMemo(() => scaleTime<number>({ domain: [steps[0].ms, nowMs], range: [0, innerW] }), [steps, nowMs, innerW]);
  const y = useMemo(() => scaleLinear<number>({ domain: [0, Math.ceil(top / 5) * 5], range: [innerH, 0] }), [top, innerH]);
  const yTicks = useMemo(() => {
    const out: number[] = [];
    for (let v = 0; v <= Math.ceil(top / 5) * 5; v += 5) out.push(v);
    return out;
  }, [top]);
  const xTicks = useMemo(() => {
    const every = innerW < 300 ? 20 : 10;
    const out: Date[] = [];
    for (let yr = 1970; Date.UTC(yr, 0, 1) <= nowMs; yr += every) out.push(new Date(Date.UTC(yr, 0, 1)));
    return out;
  }, [innerW, nowMs]);

  const shown = at === null ? null : events[at];
  const last = steps[steps.length - 1];

  const fromPointer = (e: PointerEvent<SVGRectElement>) => {
    const pt = localPoint(e);
    if (!pt) return null;
    return nearest(events, x.invert(Math.min(Math.max(pt.x - MARGIN.left, 0), innerW)).getTime());
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = at ?? events.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = Math.min(i + 1, events.length - 1);
    else if (e.key === 'ArrowLeft') next = Math.max(i - 1, 0);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = events.length - 1;
    else if ((e.key === 'Enter' || e.key === ' ') && at !== null) {
      e.preventDefault();
      pickQuiet(events[at].id);
      return;
    }
    if (next === null) return;
    e.preventDefault();
    setAt(next);
  };

  const spoken = shown ? `${calDate(shown.ms)}, ${shown.name} ${shown.kind}. ${shown.count} active after that.` : '';

  return (
    <div
      className="hl-chart"
      tabIndex={0}
      role="group"
      aria-label={`Active objects from ${new Date(steps[0].ms).getUTCFullYear()} to today, ${last.count} now. Arrow keys step through launches and mission ends, Enter shows that object in the timeline.`}
      aria-describedby={tipId}
      onKeyDown={onKey}
      onFocus={() => at === null && setAt(events.length - 1)}
      data-tick
    >
      <svg width={width} height={height} role="presentation">
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows scale={y} width={innerW} tickValues={yTicks} stroke="var(--rule)" strokeWidth={1} />
          <AxisLeft
            scale={y}
            tickValues={yTicks}
            hideAxisLine
            hideTicks
            tickFormat={(v) => String(v)}
            tickLabelProps={() => ({ ...TICK, textAnchor: 'end', dx: -6, dy: 4 })}
          />
          <text x={-MARGIN.left + 2} y={-12} {...TICK}>
            active
          </text>
          <AxisBottom
            top={innerH}
            scale={x}
            tickValues={xTicks}
            tickFormat={(v) => String((v as Date).getUTCFullYear())}
            stroke="var(--edge)"
            tickStroke="var(--edge)"
            tickLength={5}
            tickLabelProps={() => ({ ...TICK, textAnchor: 'middle', dy: 2 })}
            label="year"
            labelOffset={12}
            labelProps={{ ...TICK, textAnchor: 'middle' }}
          />
          <AreaClosed data={steps} x={(s) => x(s.ms)} y={(s) => y(s.count)} yScale={y} curve={curveStepAfter} fill="var(--line)" fillOpacity={0.1} stroke="none" />
          <LinePath
            data={steps}
            x={(s) => x(s.ms)}
            y={(s) => y(s.count)}
            curve={curveStepAfter}
            stroke="var(--line)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx={x(last.ms)} cy={y(last.count)} r={5} fill="var(--laser)" stroke="var(--bg)" strokeWidth={2} />
          {shown && (
            <g pointerEvents="none">
              <Line from={{ x: x(shown.ms), y: 0 }} to={{ x: x(shown.ms), y: innerH }} stroke="var(--muted)" strokeWidth={1} />
              <circle cx={x(shown.ms)} cy={y(shown.count)} r={4.5} fill="var(--line)" stroke="var(--bg)" strokeWidth={2} />
            </g>
          )}
          <rect
            width={innerW}
            height={innerH}
            fill="transparent"
            style={{ touchAction: 'pan-y', cursor: 'pointer' }}
            onPointerMove={(e) => {
              const i = fromPointer(e);
              if (i !== null) setAt(i);
            }}
            onPointerDown={(e) => {
              const i = fromPointer(e);
              if (i === null) return;
              setAt(i);
              pickQuiet(events[i].id);
            }}
            onPointerLeave={(e) => e.pointerType === 'mouse' && setAt(null)}
          />
        </Group>
      </svg>
      {shown && (
        <TooltipWithBounds left={MARGIN.left + x(shown.ms)} top={MARGIN.top + y(shown.count)} offsetLeft={14} offsetTop={-12} style={TIP_STYLE} className="hl-tip">
          <div className="hl-tip-x">{calDate(shown.ms)}</div>
          <div className="hl-tip-row on">
            <span className="hl-tip-key" aria-hidden="true" />
            <span className="hl-tip-v">{shown.count}</span>
            <span className="hl-tip-n">active</span>
          </div>
          <div className="qc-tip-what">
            {shown.name} {shown.kind}
          </div>
        </TooltipWithBounds>
      )}
      <p id={tipId} className="sr-only" aria-live="polite">
        {spoken}
      </p>
    </div>
  );
}

export default function QuietChart(props: Props) {
  const { parentRef, width, height } = useParentSize({ debounceTime: 60 });
  return (
    <div ref={parentRef} className="hl-chart-box">
      {width > 0 && height > 0 && <Plot {...props} width={width} height={height} />}
    </div>
  );
}
