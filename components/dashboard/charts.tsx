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
 * Architectural Enterprise Dashboard Charts
 * Clean, restrained, professional data visualization using recharts.
 */

const PALETTE = [
  "#0f766e", // Deep Teal
  "#0284c7", // Sky Blue
  "#10b981", // Emerald
  "#6366f1", // Indigo
  "#f59e0b", // Amber
  "#475569", // Slate
  "#8b5cf6", // Purple
  "#ec4899", // Pink
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
  const height = Math.max(160, chartData.length * 40);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 12, fill: "#475569", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(15, 118, 110, 0.05)", radius: 4 }}
          formatter={(v) => [`${v ?? 0}${unit}`, "Quantity"]}
          contentStyle={{
            borderRadius: "0.5rem",
            backgroundColor: "#0f172a",
            color: "#f8fafc",
            border: "1px solid #334155",
            fontSize: "12px",
            fontWeight: "500",
            padding: "8px 12px",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
          }}
          itemStyle={{ color: "#2dd4bf" }}
        />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
          {chartData.map((_, i) => (
            <Cell
              key={i}
              fill={PALETTE[i % PALETTE.length]}
              className="transition-opacity duration-150 hover:opacity-85"
            />
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
        <li
          key={d.label}
          className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-slate-50"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-xs font-bold text-slate-700">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium text-slate-900">{d.label}</span>
              <span className="tabular-nums font-semibold text-slate-700">
                {d.value} <span className="text-xs font-normal text-slate-500">sold</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[var(--brand)] transition-all duration-300"
                style={{ width: `${(d.value / max) * 100}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
