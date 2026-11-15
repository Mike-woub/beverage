"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Dashboard charts backed by `recharts`.
 * Clean minimal styling matching design tokens.
 */

const PALETTE = [
  "#0e7490",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
];

export function HorizontalBars({
  data,
  unit = "",
}: {
  data: Array<{ label: string; value: number }>;
  color?: string;
  unit?: string;
}) {
  const chartData = data.map((d) => ({ name: d.label, value: d.value }));
  const height = Math.max(140, chartData.length * 40);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-muted)" }}
          formatter={(v) => [`${v ?? 0}${unit}`, "Stock"]}
          contentStyle={{
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            fontSize: 12,
          }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RankedList({
  data,
}: {
  data: Array<{ label: string; value: number; sub?: string }>;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ol className="flex flex-col gap-3">
      {data.map((d, i) => (
        <li key={d.label} className="flex items-center gap-3">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ background: PALETTE[i % PALETTE.length] }}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium text-[var(--foreground)]">{d.label}</span>
              <span className="tabular-nums text-[var(--muted-foreground)]">{d.value}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${(d.value / max) * 100}%`, background: PALETTE[i % PALETTE.length] }}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
