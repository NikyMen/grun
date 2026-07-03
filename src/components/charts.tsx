"use client";

import { ResponsiveContainer } from "recharts";
import { DOW } from "@/lib/fmt";

export const PALETTE = ["#267351", "#c9f158", "#59ad83", "#163d2e", "#a4cf2e", "#8bcaa8", "#379066", "#d7fa6b"];
export const GREEN = "#267351";
export const LIME = "#c9f158";
export const DARK = "#163d2e";

export function ChartCard({
  title,
  subtitle,
  children,
  height = 280,
  right,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactElement;
  height?: number;
  right?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold text-grun-950">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Mapa de calor día de semana × hora (conversaciones)
export function Heatmap({
  data,
  title,
  subtitle,
}: {
  data: { dow: number; hour: number; contacts: number }[];
  title: string;
  subtitle?: string;
}) {
  const grid = new Map<string, number>();
  let max = 0;
  for (const d of data) {
    grid.set(`${d.dow}-${d.hour}`, d.contacts);
    if (d.contacts > max) max = d.contacts;
  }
  const hours = Array.from({ length: 24 }, (_, h) => h);
  const days = [1, 2, 3, 4, 5, 6, 0]; // lunes a domingo

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h3 className="text-sm font-bold text-grun-950">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      <div className="mt-3 overflow-x-auto">
        <div className="grid gap-[3px] min-w-[640px]" style={{ gridTemplateColumns: `44px repeat(24, 1fr)` }}>
          <div />
          {hours.map((h) => (
            <div key={h} className="text-[9px] text-gray-400 text-center">{h}</div>
          ))}
          {days.map((d) => (
            <FragmentRow key={d} d={d} hours={hours} grid={grid} max={max} />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400">
          Menos
          {[0.15, 0.35, 0.6, 1].map((o) => (
            <span key={o} className="w-4 h-3 rounded-sm inline-block" style={{ backgroundColor: `rgba(38,115,81,${o})` }} />
          ))}
          Más conversaciones
        </div>
      </div>
    </div>
  );
}

function FragmentRow({
  d,
  hours,
  grid,
  max,
}: {
  d: number;
  hours: number[];
  grid: Map<string, number>;
  max: number;
}) {
  return (
    <>
      <div className="text-[10px] text-gray-500 font-medium pr-1 flex items-center">{DOW[d]}</div>
      {hours.map((h) => {
        const v = grid.get(`${d}-${h}`) || 0;
        const intensity = max > 0 ? v / max : 0;
        return (
          <div
            key={h}
            title={`${DOW[d]} ${h}:00 · ${v} conversaciones`}
            className="h-6 rounded-sm border border-gray-100 cursor-default"
            style={{
              backgroundColor: v === 0 ? "#f6f8f7" : `rgba(38,115,81,${0.12 + intensity * 0.88})`,
            }}
          />
        );
      })}
    </>
  );
}

export function EmptyState({ text = "Sin datos para los filtros elegidos" }: { text?: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
      {text}
    </div>
  );
}
