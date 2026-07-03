"use client";

/* Ventas reales por sucursal y su origen (pauta vs otros canales) */

import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { ShoppingBag, Banknote, Receipt, Megaphone } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import Filters, { FilterValues, filtersToQuery } from "@/components/Filters";
import AiInsight from "@/components/AiInsight";
import { ChartCard, GREEN, LIME, PALETTE, EmptyState } from "@/components/charts";
import { fmtMoney, fmtNum, fmtPct } from "@/lib/fmt";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function VentasPage() {
  const [f, setF] = useState<FilterValues>({});
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/metrics?section=ventas&${filtersToQuery(f)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [f]);

  const totals = useMemo(() => {
    const rows = data?.byBranch || [];
    const sales = rows.reduce((a: number, r: any) => a + r.sales, 0);
    const revenue = rows.reduce((a: number, r: any) => a + r.revenue, 0);
    const fromAds = rows.reduce((a: number, r: any) => a + (r.fromAds || 0), 0);
    return { sales, revenue, fromAds, avg: sales ? revenue / sales : 0 };
  }, [data]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black text-grun-950">Ventas</h1>
        <p className="text-sm text-gray-500">De dónde salen las compras reales, sucursal por sucursal</p>
      </header>

      <Filters value={f} onChange={setF} show={["dates", "branch"]} branchSource="sales" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Ventas" value={fmtNum(totals.sales)} icon={ShoppingBag} accent />
        <KpiCard label="Facturación" value={fmtMoney(totals.revenue)} icon={Banknote} />
        <KpiCard label="Ticket promedio" value={fmtMoney(totals.avg)} icon={Receipt} />
        <KpiCard
          label="Vinculadas a pauta"
          value={fmtNum(totals.fromAds)}
          hint={totals.sales ? `${fmtPct((totals.fromAds / totals.sales) * 100)} del total (por teléfono)` : undefined}
          icon={Megaphone}
        />
      </div>

      <AiInsight section="ventas" filters={f} />

      <div className="grid lg:grid-cols-2 gap-4">
        {data?.byBranch?.length ? (
          <ChartCard title="Ventas y facturación por sucursal" subtitle="Verde: ventas totales · Lima: vinculadas a pauta">
            <BarChart data={data.byBranch} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" />
              <XAxis dataKey="branch" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="sales" name="Ventas" fill={GREEN} radius={[4, 4, 0, 0]} />
              <Bar dataKey="fromAds" name="Vinculadas a pauta" fill={LIME} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>
        ) : (
          <EmptyState />
        )}

        {data?.byDay?.length ? (
          <ChartCard title="Facturación por día" subtitle="Evolución diaria de las ventas">
            <AreaChart data={data.byDay} margin={{ left: 10, right: 10 }}>
              <defs>
                <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GREEN} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={GREEN} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtNum(v / 1000) + "k"} />
              <Tooltip formatter={(v: any, n: any) => [n === "Facturación" ? fmtMoney(v) : fmtNum(v), n]} />
              <Area dataKey="revenue" name="Facturación" stroke={GREEN} strokeWidth={2} fill="url(#gVentas)" />
            </AreaChart>
          </ChartCard>
        ) : (
          <EmptyState />
        )}

        {data?.newVsOld?.length ? (
          <ChartCard title="Clientes nuevos vs existentes" subtitle="Según fecha de alta en el sistema de ventas">
            <PieChart>
              <Pie
                data={data.newVsOld}
                dataKey="sales"
                nameKey="tipo"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={3}
                label={(e: any) => `${e.tipo}: ${fmtNum(e.sales)}`}
              >
                {data.newVsOld.map((_: any, i: number) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => fmtNum(v)} />
            </PieChart>
          </ChartCard>
        ) : (
          <EmptyState />
        )}

        {data?.byBranch?.length ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-grun-950 mb-2">Resumen por sucursal</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="py-2 font-medium">Sucursal</th>
                  <th className="py-2 font-medium text-right">Ventas</th>
                  <th className="py-2 font-medium text-right">Facturación</th>
                  <th className="py-2 font-medium text-right">Ticket prom.</th>
                  <th className="py-2 font-medium text-right">De pauta</th>
                </tr>
              </thead>
              <tbody>
                {data.byBranch.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 font-medium text-grun-950">{r.branch}</td>
                    <td className="py-2 text-right">{fmtNum(r.sales)}</td>
                    <td className="py-2 text-right">{fmtMoney(r.revenue)}</td>
                    <td className="py-2 text-right">{fmtMoney(r.avgTicket)}</td>
                    <td className="py-2 text-right font-semibold text-grun-700">
                      {fmtNum(r.fromAds)} <span className="text-gray-400 font-normal">({r.sales ? Math.round((r.fromAds / r.sales) * 100) : 0}%)</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {data?.top?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <h3 className="text-sm font-bold text-grun-950 px-4 pt-4">Mayores ventas del período</h3>
          <div className="overflow-x-auto mt-2 max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-2 font-medium">Cliente</th>
                  <th className="px-4 py-2 font-medium">Sucursal</th>
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium text-right">Importe</th>
                  <th className="px-4 py-2 font-medium text-right">Facturas</th>
                  <th className="px-4 py-2 font-medium text-right">Origen</th>
                </tr>
              </thead>
              <tbody>
                {data.top.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-grun-50/50">
                    <td className="px-4 py-2 font-medium text-grun-950">{r.client}</td>
                    <td className="px-4 py-2 text-gray-600">{r.branch}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{r.last_sale_date}</td>
                    <td className="px-4 py-2 text-right font-semibold">{fmtMoney(r.amount)}</td>
                    <td className="px-4 py-2 text-right">{r.invoices}</td>
                    <td className="px-4 py-2 text-right">
                      {r.fromAds ? (
                        <span className="text-[10px] font-bold bg-lima text-grun-950 rounded-full px-2 py-0.5">PAUTA</span>
                      ) : (
                        <span className="text-[10px] text-gray-400">otro canal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
