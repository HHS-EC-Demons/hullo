import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { scaleBand, scaleLinear } from '@visx/scale';
import { AxisBottom } from '@visx/axis';
import { Group } from '@visx/group';
import { useParentSize } from '@visx/responsive';
import { TooltipWithBounds } from '@visx/tooltip';
import { GROUPS, STAMP_OBJECTS, type StampObject } from '../data/stamps';
import type { Stamp } from '../lib/passport';

interface Props {
  byId: Map<string, Stamp>;
  dayText: (ms: number) => string;
}

interface Unit {
  object: StampObject;
  row: number;
  col: number;
}

const WIDE = { top: 4, right: 64, bottom: 40, left: 96 };
const NARROW = { top: 4, right: 46, bottom: 40, left: 92 };
const TICK = { fill: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 12.5 } as const;

function Plot({ byId, dayText, width, height }: Props & { width: number; height: number }) {
  const tipId = useId();
  const [at, setAt] = useState<number | null>(null);
  const rows = useMemo(() => GROUPS.map((g) => ({ ...g, objects: STAMP_OBJECTS.filter((o) => o.group === g.key) })).filter((g) => g.objects.length > 0), []);
  const units = useMemo<Unit[]>(() => rows.flatMap((g, row) => g.objects.map((object, col) => ({ object, row, col }))), [rows]);
  const most = Math.max(...rows.map((g) => g.objects.length));

  const MARGIN = width < 520 ? NARROW : WIDE;
  const innerW = Math.max(width - MARGIN.left - MARGIN.right, 60);
  const innerH = Math.max(height - MARGIN.top - MARGIN.bottom, 60);
  const y = useMemo(() => scaleBand<number>({ domain: rows.map((_, i) => i), range: [0, innerH], padding: 0.28 }), [rows, innerH]);
  const x = useMemo(() => scaleLinear<number>({ domain: [0, most], range: [0, innerW] }), [most, innerW]);
  const step = innerW / most;
  const size = Math.max(Math.min(step - 4, y.bandwidth(), 30), 6);

  const shown = at === null ? null : units[at];
  const stampOf = (o: StampObject) => byId.get(o.id);

  const move = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = at ?? 0;
    const u = units[i];
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = Math.min(i + 1, units.length - 1);
    else if (e.key === 'ArrowLeft') next = Math.max(i - 1, 0);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const row = Math.min(Math.max(u.row + (e.key === 'ArrowDown' ? 1 : -1), 0), rows.length - 1);
      const inRow = units.filter((v) => v.row === row);
      const target = inRow[Math.min(u.col, inRow.length - 1)];
      next = units.indexOf(target);
    } else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = units.length - 1;
    if (next === null) return;
    e.preventDefault();
    setAt(next);
  };

  const tipText = (u: Unit) => {
    const s = stampOf(u.object);
    return s ? `Stamped ${dayText(s.at)}` : 'Not stamped yet';
  };

  const ticks = useMemo(() => {
    const out = [0];
    for (let v = 5; v < most; v += 5) out.push(v);
    out.push(most);
    return out;
  }, [most]);

  return (
    <div
      className="hl-chart"
      tabIndex={0}
      role="group"
      aria-label={`Stamps by page, ${byId.size} of ${STAMP_OBJECTS.length}. Arrow keys move from object to object.`}
      aria-describedby={tipId}
      onKeyDown={move}
      onFocus={() => at === null && setAt(0)}
      onBlur={() => setAt(null)}
      data-tick
    >
      <svg width={width} height={height} role="presentation">
        <Group left={MARGIN.left} top={MARGIN.top}>
          {rows.map((g, row) => {
            const got = g.objects.filter((o) => byId.has(o.id)).length;
            const cy = (y(row) ?? 0) + y.bandwidth() / 2;
            return (
              <g key={g.key}>
                <text x={-12} y={cy + 5} textAnchor="end" fontFamily="var(--sans)" fontSize={15} fill="var(--text)">
                  {g.title}
                </text>
                <text x={x(g.objects.length) + 10} y={cy + 4} {...TICK}>
                  {got}/{g.objects.length}
                </text>
              </g>
            );
          })}
          {units.map((u, i) => {
            const on = stampOf(u.object) !== undefined;
            const cx = x(u.col) + step / 2;
            const cy = (y(u.row) ?? 0) + y.bandwidth() / 2;
            const picked = at === i;
            return (
              <rect
                key={u.object.id}
                x={cx - size / 2 + (on ? 0 : 1)}
                y={cy - size / 2 + (on ? 0 : 1)}
                width={on ? size : size - 2}
                height={on ? size : size - 2}
                rx={4}
                fill={on ? 'var(--line)' : 'transparent'}
                stroke={picked ? 'var(--text)' : on ? 'none' : 'var(--edge)'}
                strokeWidth={picked ? 2.5 : 2}
                style={{ cursor: 'pointer' }}
                onPointerEnter={() => setAt(i)}
                onPointerDown={() => setAt(i)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && setAt(null)}
              />
            );
          })}
          <AxisBottom
            top={innerH}
            scale={x}
            tickValues={ticks}
            tickFormat={(v) => String(v)}
            stroke="var(--edge)"
            tickStroke="var(--edge)"
            tickLength={5}
            tickLabelProps={() => ({ ...TICK, textAnchor: 'middle', dy: 2 })}
            label="objects"
            labelOffset={12}
            labelProps={{ ...TICK, textAnchor: 'middle' }}
          />
        </Group>
      </svg>
      {shown && (
        <TooltipWithBounds
          left={MARGIN.left + x(shown.col) + step / 2}
          top={MARGIN.top + (y(shown.row) ?? 0)}
          offsetLeft={12}
          offsetTop={-36}
          unstyled
          className="hl-tip"
        >
          <div className="hl-tip-x">{tipText(shown)}</div>
          <div className="pc-tip-name">{shown.object.name}</div>
          {stampOf(shown.object)?.detail && <div className="pc-tip-detail">{stampOf(shown.object)?.detail}</div>}
        </TooltipWithBounds>
      )}
      <p id={tipId} className="sr-only" aria-live="polite">
        {shown ? `${shown.object.name}, ${tipText(shown)}` : ''}
      </p>
    </div>
  );
}

export default function PassportChart(props: Props) {
  const { parentRef, width, height } = useParentSize({ debounceTime: 60 });
  return (
    <div ref={parentRef} className="hl-chart-box">
      {width > 0 && height > 0 && <Plot {...props} width={width} height={height} />}
    </div>
  );
}
