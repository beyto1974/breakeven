"use client";

import { useId, useRef, useState } from "react";
import { linear, niceScale } from "@/chart/scale";
import type { Projection } from "@/domain/types";
import type { Formatter } from "@/format/format";
import type { Messages } from "@/i18n/messages";
import { capitalize, type Nouns } from "@/i18n/nouns";

const W = 760;
const H = 300;
const PAD = { l: 64, r: 14, t: 26, b: 30 };

export function ProjectionChart({ projection: p, t, fmt, noun }: { projection: Projection; t: Messages; fmt: Formatter; noun: Nouns }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const clip = useId().replace(/:/g, "");

  const n = p.months.length;
  const values = p.months.flatMap((m) => [m.revenueCents, m.costCents, m.cumulativeMarginCents]);
  const scale = niceScale(Math.min(...values), Math.max(...values), 5);
  const y = linear([scale.min, scale.max], [H - PAD.b, PAD.t]);
  const band = (W - PAD.l - PAD.r) / n;
  const x = (i: number) => PAD.l + band * (i + 0.5);
  const bw = Math.max(2, band * 0.62);
  const zero = y(0);

  const line = (pick: (i: number) => number) => p.months.map((_, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(pick(i)).toFixed(1)}`).join(" ");
  const cumulative = line((i) => p.months[i]!.cumulativeMarginCents);
  const area = `${cumulative} L${x(n - 1).toFixed(1)},${zero} L${x(0).toFixed(1)},${zero} Z`;
  const revenue = line((i) => p.months[i]!.revenueCents);
  const every = n <= 12 ? 1 : n <= 24 ? 3 : n <= 60 ? 6 : 12;
  const markers = (
    [
      [p.breakEvenMonth, t.chart.breakEven],
      [p.paybackMonth, t.chart.payback],
    ] as const
  ).filter((m): m is readonly [number, string] => m[0] !== null);

  const pick = (clientX: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const vx = ((clientX - rect.left) / rect.width) * W;
    setHover(Math.min(n - 1, Math.max(0, Math.floor((vx - PAD.l) / band))));
  };
  const hovered = hover === null ? null : p.months[hover];

  return (
    <div className="chart-wrap">
      <svg
        ref={svgRef}
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t.chart.aria}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <clipPath id={`${clip}-above`}>
            <rect x="0" y="0" width={W} height={Math.max(0, zero)} />
          </clipPath>
          <clipPath id={`${clip}-below`}>
            <rect x="0" y={zero} width={W} height={Math.max(0, H - zero)} />
          </clipPath>
        </defs>
        {scale.ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(tick)} y2={y(tick)} stroke="var(--line)" strokeDasharray={tick === 0 ? undefined : "3 4"} />
            <text x={PAD.l - 8} y={y(tick) + 4} textAnchor="end" className="axis">
              {fmt.moneyShort(tick)}
            </text>
          </g>
        ))}
        {p.months.map((m, i) => {
          let top = zero;
          return (
            <g key={m.month}>
              {(
                [
                  [m.fixedCostCents, "var(--cost-fixed)"],
                  [m.variableCostCents, "var(--cost-variable)"],
                  [m.acquisitionCostCents, "var(--cost-acq)"],
                ] as const
              ).map(([v, color]) => {
                if (v <= 0) return null;
                const h = zero - y(v);
                top -= h;
                return <rect key={color} x={x(i) - bw / 2} y={top} width={bw} height={h} fill={color} opacity={hover === i ? 0.85 : 0.55} />;
              })}
            </g>
          );
        })}
        <path d={area} fill="var(--profit)" opacity={0.16} clipPath={`url(#${clip}-above)`} />
        <path d={area} fill="var(--loss)" opacity={0.16} clipPath={`url(#${clip}-below)`} />
        <path d={cumulative} fill="none" stroke="var(--profit)" strokeWidth={2} clipPath={`url(#${clip}-above)`} />
        <path d={cumulative} fill="none" stroke="var(--loss)" strokeWidth={2} clipPath={`url(#${clip}-below)`} />
        <path d={revenue} fill="none" stroke="var(--accent)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" className="draw" />
        <line x1={PAD.l} x2={W - PAD.r} y1={zero} y2={zero} stroke="var(--muted)" />
        {markers.map(([month, label], k) => {
          const xi = x(month - 1);
          const end = xi > W - 120;
          return (
            <g key={label}>
              <line x1={xi} x2={xi} y1={PAD.t - 8} y2={H - PAD.b} stroke="var(--ink)" strokeDasharray="2 3" />
              <text x={xi + (end ? -6 : 6)} y={PAD.t - 12 + k * 13} textAnchor={end ? "end" : "start"} className="axis ink">
                {label} · M{month}
              </text>
            </g>
          );
        })}
        {p.months
          .filter((m) => m.month === 1 || m.month % every === 0)
          .map((m) => (
            <text key={m.month} x={x(m.month - 1)} y={H - 10} textAnchor="middle" className="axis">
              M{m.month}
            </text>
          ))}
        {hover !== null ? <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke="var(--accent)" /> : null}
        {hovered ? (
          <circle cx={x(hover!)} cy={y(hovered.cumulativeMarginCents)} r={4} fill="var(--surface)" stroke={hovered.cumulativeMarginCents >= 0 ? "var(--profit)" : "var(--loss)"} strokeWidth={2} />
        ) : null}
      </svg>
      {hovered ? (
        <div className="tip" style={{ left: `${(x(hover!) / W) * 100}%`, top: `${((PAD.t + 4) / H) * 100}%` }}>
          <b>{t.chart.month(hovered.month)}</b>
          {(
            [
              [capitalize(noun.customer()), fmt.integer(hovered.customers)],
              [t.chart.tip.revenue, fmt.money(hovered.revenueCents)],
              [t.chart.tip.costs, fmt.money(hovered.costCents)],
              [t.chart.tip.margin, fmt.money(hovered.marginCents)],
              [t.chart.tip.cumulative, fmt.money(hovered.cumulativeMarginCents)],
            ] as const
          ).map(([k, v]) => (
            <div className="r" key={k}>
              <span>{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
