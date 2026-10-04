/**
 * @license
 * SPDX-License-Identifier: LicenseRef-Nexus-Noncommercial
 */

import React, { useEffect, useState } from 'react';

export interface SalesPoint {
  label: string;
  revenue: number;
  unitsSold: number;
}

function useDarkClass() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

function niceScale(maxVal: number) {
  if (maxVal <= 0) return { ticks: [0], upperLimit: 1 };
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 50000, 100000];
  let step = steps[steps.length - 1];
  for (const candidate of steps) {
    if (maxVal / candidate <= 5) {
      step = candidate;
      break;
    }
  }
  const upperLimit = Math.ceil(maxVal / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= upperLimit; value += step) ticks.push(value);
  return { ticks, upperLimit };
}

/** Monotone cubic spline. The curve passes through every point and does not overshoot. */
function monotonePath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const count = points.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    dx[i] = points[i + 1].x - points[i].x || 1;
    slope[i] = (points[i + 1].y - points[i].y) / dx[i];
  }

  const tangent = new Array<number>(count).fill(0);
  tangent[0] = slope[0];
  tangent[count - 1] = slope[count - 2];
  for (let i = 1; i < count - 1; i++) {
    tangent[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }

  for (let i = 0; i < count - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const size = a * a + b * b;
    if (size > 9) {
      const scale = 3 / Math.sqrt(size);
      tangent[i] = scale * a * slope[i];
      tangent[i + 1] = scale * b * slope[i];
    }
  }

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < count - 1; i++) {
    const c1x = points[i].x + dx[i] / 3;
    const c1y = points[i].y + (tangent[i] * dx[i]) / 3;
    const c2x = points[i + 1].x - dx[i] / 3;
    const c2y = points[i + 1].y - (tangent[i + 1] * dx[i]) / 3;
    path += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${points[i + 1].x.toFixed(2)} ${points[i + 1].y.toFixed(2)}`;
  }
  return path;
}

export function buildMonthlySales(
  orders: { date: string; status?: string; items: { price: number; quantity: number }[] }[]
): SalesPoint[] {
  const now = new Date();
  const points: SalesPoint[] = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    points.push({
      label: date.toLocaleDateString([], { month: 'short' }),
      revenue: 0,
      unitsSold: 0
    });
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    orders.forEach((order) => {
      if (order.status === 'refunded') return;
      const orderDate = new Date(order.date);
      const orderKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      if (orderKey !== key) return;
      order.items.forEach((item) => {
        points[points.length - 1].revenue += item.price * item.quantity;
        points[points.length - 1].unitsSold += item.quantity;
      });
    });
  }
  return points;
}

interface SalesChartProps {
  points: SalesPoint[];
  title?: string;
}

export default function SalesChart({ points, title }: SalesChartProps) {
  const dark = useDarkClass();
  const [hovered, setHovered] = useState<number | null>(null);

  const width = 720;
  const height = 280;
  const padLeft = 58;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 36;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const maxRevenue = Math.max(...points.map((point) => point.revenue), 0);
  const { ticks, upperLimit } = niceScale(maxRevenue);
  const ink = dark ? '#F3EDE4' : '#1A1A1A';
  const grid = dark ? 'rgba(243,237,228,0.12)' : 'rgba(26,26,26,0.08)';
  const mute = dark ? '#A3988C' : '#8A8178';

  const coords = points.map((point, index) => {
    const x = points.length === 1
      ? padLeft + plotWidth / 2
      : padLeft + (index * plotWidth) / (points.length - 1);
    const y = padTop + plotHeight - (point.revenue / upperLimit) * plotHeight;
    return { x, y };
  });

  const line = monotonePath(coords);
  const baseline = padTop + plotHeight;
  const area = coords.length > 0
    ? `${line} L ${coords[coords.length - 1].x.toFixed(2)} ${baseline} L ${coords[0].x.toFixed(2)} ${baseline} Z`
    : '';
  const active = hovered ?? coords.length - 1;
  const activePoint = points[active];

  return (
    <div className="space-y-4">
      {title && (
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-500">{title}</p>
      )}
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Sales chart">
          <defs>
            <linearGradient id="sales-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={dark ? '#E7D7C3' : '#8C7355'} stopOpacity={dark ? 0.35 : 0.28} />
              <stop offset="100%" stopColor={dark ? '#E7D7C3' : '#8C7355'} stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((tick) => {
            const y = padTop + plotHeight - (tick / upperLimit) * plotHeight;
            return (
              <g key={tick}>
                <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke={grid} strokeWidth="1" />
                <text x={padLeft - 10} y={y + 3} textAnchor="end" fill={mute} fontSize="11" fontFamily="Space Mono, ui-monospace, monospace">
                  ${tick >= 1000 ? `${Math.round(tick / 100) / 10}k`.replace('.0k', 'k') : tick}
                </text>
              </g>
            );
          })}

          {area && <path d={area} fill="url(#sales-area)" />}
          {line && (
            <path d={line} fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {coords.map((point, index) => {
            const showLabel = points.length <= 12 || index % Math.ceil(points.length / 8) === 0 || index === points.length - 1;
            return (
              <g key={`${points[index].label}-${index}`}>
                {showLabel && (
                  <text x={point.x} y={height - 10} textAnchor="middle" fill={mute} fontSize="11" fontFamily="Space Mono, ui-monospace, monospace">
                    {points[index].label}
                  </text>
                )}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={hovered === index ? 5.5 : 3.5}
                  fill={dark ? '#1A1816' : '#FAF9F6'}
                  stroke={ink}
                  strokeWidth="2"
                />
                <rect
                  x={point.x - plotWidth / Math.max(points.length, 1) / 2}
                  y={padTop}
                  width={plotWidth / Math.max(points.length, 1)}
                  height={plotHeight}
                  fill="transparent"
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                />
              </g>
            );
          })}

          {coords[active] && (
            <line
              x1={coords[active].x}
              y1={padTop}
              x2={coords[active].x}
              y2={baseline}
              stroke={ink}
              strokeOpacity="0.18"
              strokeDasharray="3 4"
            />
          )}
        </svg>
      </div>

      {activePoint && (
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-neutral-900/10 pt-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">{activePoint.label}</p>
          <div className="flex gap-6">
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">Revenue</p>
              <p className="font-serif text-lg font-semibold text-neutral-950">
                ${activePoint.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">Units</p>
              <p className="font-serif text-lg font-semibold text-neutral-950">{activePoint.unitsSold}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
