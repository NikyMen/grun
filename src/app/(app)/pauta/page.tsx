"use client";

/* Pauta Meta: campañas, conjuntos, públicos y costo por resultado */

import { useEffect, useMemo, useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  BarChart, PieChart, Pie, Cell,
} from "recharts";
import { Wallet, MousePointerClick, Eye, Coins } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import Filters, { FilterValues, filtersToQuery } from "@/components/Filters";
import AiInsight from "@/components/AiInsight";
import { ChartCard, GREEN, LIME, DARK, PALETTE, EmptyState } from "@/components/charts";
import { fmtMoney, fmtNum, sexLabel } from "@/lib/fmt";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function PautaPage() {
  const [f, setF] = useState<FilterValues>({});
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/metrics?section=pauta&${filtersToQuery(f)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [f]);

  const totals = useMemo(() => {
    const rows = data?.byCampaign || [];
    const spend = rows.reduce((a: number, r: any) => a + r.spend, 0);
    const results = rows.reduce((a: number, r: any) => a + r.results, 0);
    const impressions = rows.reduce((a: number, r: any) => a + r.impressions, 0);
    const reach = rows.reduce((a: number, r: any) => a + r.reach, 0);
    return { spend, results, impressions, reach, cpr: results > 0 ? spend / results : 0 };
  }, [data]);

  const ageSexData = useMemo(() => {
    if (!data?.byAgeSex) return [];
    const byAge = new Map<string, any>();
    for (const r of data.byAgeSex) {
      if (!byAge.has(r.age)) byAge.set(r.age, { age: r.age });
      byAge.get(r.age)[sexLabel(r.sex)] = r.results;
    }
    return Array.from(byAge.values());
  }, [data]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black text-grun-950">Pauta Meta</h1>
        <p className="text-sm text-gray-500">Discriminá la inversión: qué campañas, conjuntos y públicos rinden mejor</p>
      </header>

      <Filters value={f} onChange={setF} show={["campaign", "adset", "age", "sex", "resultType"]} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Inversión total" value={fmtMoney(totals.spend)} icon={Wallet} accent />
        <KpiCard label="Resultados" value={fmtNum(totals.results)} hint="según tipo de resultado" icon={MousePointerClick} />
        <KpiCard label="Costo por resultado" value={totals.cpr ? fmtMoney(totals.cpr) : "—"} icon={Coins} />
        <KpiCard label="Alcance / Impresiones" value={fmtNum(totals.reach)} hint={`${fmtNum(totals.impressions)} impresiones`} icon={Eye} />
      </div>

      <AiInsight section="pauta" filters={f} />

      <div className="grid lg:grid-cols-2 gap-4">
        {data?.byCampaign?.length ? (
          <ChartCard title="Gasto y costo por resultado por campaña" subtitle="Barras: gasto · Línea: costo por resultado">
            <ComposedChart data={data.byCampaign} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" />
              <XAxis dataKey="campaign" tick={{ fontSize: 10 }} interval={0} angle={-14} height={52} textAnchor="end" />
              <YAxis yAxisId="l" tick={{ fontSize: 10 }} tickFormatter={(v) => fmtNum(v)} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => fmtNum(v)} />
              <Tooltip formatter={(v: any, n: any) => [fmtMoney(v), n]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" dataKey="spend" name="Gasto" fill={GREEN} radius={[4, 4, 0, 0]} />
              <Line yAxisId="r" dataKey="costPerResult" name="Costo por resultado" stroke={DARK} strokeWidth={2} dot={{ fill: LIME, r: 4 }} />
            </ComposedChart>
          </ChartCard>
        ) : (
          <EmptyState />
        )}

        {ageSexData.length ? (
          <ChartCard title="Resultados por edad y sexo" subtitle="¿A quién le llega la pauta?">
            <BarChart data={ageSexData} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Hombres" fill={GREEN} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Mujeres" fill={LIME} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Sin datos" fill="#c8d5cd" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>
        ) : (
          <EmptyState />
        )}

        {data?.byAge?.length ? (
          <ChartCard title="Costo por resultado según edad" subtitle="¿Qué público sale más barato?">
            <ComposedChart data={data.byAge} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="l" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => fmtNum(v)} />
              <Tooltip formatter={(v: any, n: any) => [n === "Resultados" ? fmtNum(v) : fmtMoney(v), n]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" dataKey="results" name="Resultados" fill={LIME} stroke={GREEN} radius={[4, 4, 0, 0]} />
              <Line yAxisId="r" dataKey="costPerResult" name="Costo por resultado" stroke={DARK} strokeWidth={2} dot={{ fill: GREEN, r: 4 }} />
            </ComposedChart>
          </ChartCard>
        ) : (
          <EmptyState />
        )}

        {data?.bySex?.length ? (
          <ChartCard title="Resultados por sexo" subtitle="Distribución de resultados de la pauta">
            <PieChart>
              <Pie
                data={data.bySex.map((r: any) => ({ ...r, name: sexLabel(r.sex) }))}
                dataKey="results"
                nameKey="name"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={3}
                label={(e: any) => `${e.name}: ${fmtNum(e.results)}`}
              >
                {data.bySex.map((_: any, i: number) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => fmtNum(v)} />
            </PieChart>
          </ChartCard>
        ) : (
          <EmptyState />
        )}
      </div>

      {data?.byAdset?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <h3 className="text-sm font-bold text-grun-950 px-4 pt-4">Detalle por conjunto de anuncios</h3>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-2 font-medium">Campaña</th>
                  <th className="px-4 py-2 font-medium">Conjunto</th>
                  <th className="px-4 py-2 font-medium">Tipo de resultado</th>
                  <th className="px-4 py-2 font-medium text-right">Alcance</th>
                  <th className="px-4 py-2 font-medium text-right">Impresiones</th>
                  <th className="px-4 py-2 font-medium text-right">Resultados</th>
                  <th className="px-4 py-2 font-medium text-right">Gasto</th>
                  <th className="px-4 py-2 font-medium text-right">Costo/result.</th>
                </tr>
              </thead>
              <tbody>
                {data.byAdset.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-grun-50/50">
                    <td className="px-4 py-2 text-gray-600">{r.campaign}</td>
                    <td className="px-4 py-2 font-medium text-grun-950">{r.adset}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{r.resultType}</td>
                    <td className="px-4 py-2 text-right">{fmtNum(r.reach)}</td>
                    <td className="px-4 py-2 text-right">{fmtNum(r.impressions)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{fmtNum(r.results)}</td>
                    <td className="px-4 py-2 text-right">{fmtMoney(r.spend)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-grun-800">{r.costPerResult ? fmtMoney(r.costPerResult) : "—"}</td>
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
