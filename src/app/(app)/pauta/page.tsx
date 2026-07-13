"use client";

/* Pauta Meta — foco: cuánto invertimos en publicidad y cuánto de la facturación
   viene de esos contactos (cruce por teléfono con el CRM) */

import { useEffect, useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Wallet, Banknote, Link2, Target } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import Filters, { FilterValues, filtersToQuery } from "@/components/Filters";
import AiInsight from "@/components/AiInsight";
import { ChartCard, GREEN, LIME, DARK, EmptyState } from "@/components/charts";
import { fmtMoney, fmtNum, fmtPct } from "@/lib/fmt";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function PautaPage() {
  const [f, setF] = useState<FilterValues>({});
  const [ov, setOv] = useState<any>(null);
  const [pauta, setPauta] = useState<any>(null);

  useEffect(() => {
    const q = filtersToQuery(f);
    Promise.all([
      fetch(`/api/metrics?section=overview&${q}`).then((r) => r.json()),
      fetch(`/api/metrics?section=pauta&${q}`).then((r) => r.json()),
    ])
      .then(([o, p]) => { setOv(o); setPauta(p); })
      .catch(() => {});
  }, [f]);

  const linkedPct = ov && ov.sales > 0 ? (ov.matchedSales / ov.sales) * 100 : 0;
  const roas = ov?.roas || 0;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black text-grun-950">Pauta Meta</h1>
        <p className="text-sm text-gray-500">
          Cuánto invertimos en publicidad y qué parte de la facturación viene de esos contactos
          (cruce por teléfono con el CRM)
        </p>
      </header>

      <Filters value={f} onChange={setF} show={["dates", "campaign"]} />

      {ov && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Inversión en pauta"
            value={fmtMoney(ov.spend)}
            hint="lo que gastamos en Meta"
            icon={Wallet}
            accent
          />
          <KpiCard
            label="Facturación del período"
            value={fmtMoney(ov.revenue)}
            hint={`${fmtNum(ov.sales)} ventas en total`}
            icon={Banknote}
          />
          <KpiCard
            label="Ventas vinculadas al CRM"
            value={`${fmtNum(ov.matchedSales)} de ${fmtNum(ov.sales)}`}
            hint={`${fmtPct(linkedPct)} del total · cruce por teléfono`}
            icon={Link2}
            accent
          />
          <KpiCard
            label="Facturación vinculada"
            value={fmtMoney(ov.matchedRevenue)}
            hint="ventas de contactos que escribieron"
            icon={Target}
          />
        </div>
      )}

      {ov && <InvestmentVsBilling ov={ov} linkedPct={linkedPct} roas={roas} />}

      <AiInsight section="overview" filters={f} />

      {pauta?.byCampaign?.length ? (
        <ChartCard title="Inversión por campaña" subtitle="Barras: gasto · Línea: costo por resultado">
          <ComposedChart data={pauta.byCampaign} margin={{ left: 10, right: 10 }}>
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

      {pauta?.byCampaign?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <h3 className="text-sm font-bold text-grun-950 px-4 pt-4">Resumen por campaña</h3>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-2 font-medium">Campaña</th>
                  <th className="px-4 py-2 font-medium text-right">Resultados</th>
                  <th className="px-4 py-2 font-medium text-right">Gasto</th>
                  <th className="px-4 py-2 font-medium text-right">Costo/result.</th>
                </tr>
              </thead>
              <tbody>
                {pauta.byCampaign.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-grun-50/50">
                    <td className="px-4 py-2 font-medium text-grun-950">{r.campaign}</td>
                    <td className="px-4 py-2 text-right">{fmtNum(r.results)}</td>
                    <td className="px-4 py-2 text-right font-semibold">{fmtMoney(r.spend)}</td>
                    <td className="px-4 py-2 text-right text-grun-800">{r.costPerResult ? fmtMoney(r.costPerResult) : "—"}</td>
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

/* Comparación clara inversión vs facturación, pensada para el cliente */
function InvestmentVsBilling({ ov, linkedPct, roas }: { ov: any; linkedPct: number; roas: number }) {
  const spend = ov.spend || 0;
  const linkedRev = ov.matchedRevenue || 0;
  const totalRev = ov.revenue || 0;
  const max = Math.max(spend, totalRev, 1);

  const Row = ({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) => (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-medium text-grun-900">{label}</span>
        <span className="text-sm font-bold text-grun-950">{fmtMoney(value)}</span>
      </div>
      <div className="h-7 bg-gray-100 rounded-md overflow-hidden">
        <div className="h-full rounded-md transition-all" style={{ width: `${Math.max((value / max) * 100, 3)}%`, background: color }} />
      </div>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-grun-950">Inversión publicitaria vs facturación</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Facturación vinculada = ventas cuyo teléfono coincide con un contacto del CRM
          </p>
        </div>
        {spend > 0 && (
          <div className="text-right">
            <p className="text-3xl font-black text-grun-700 leading-none">{roas.toFixed(2)}x</p>
            <p className="text-[11px] text-gray-400 mt-1">facturación vinculada por cada $1 de pauta</p>
          </div>
        )}
      </div>
      <div className="space-y-4">
        <Row label="Inversión en pauta" value={spend} color={DARK} />
        <Row
          label="Facturación vinculada al CRM"
          value={linkedRev}
          color={GREEN}
          sub={`${fmtNum(ov.matchedSales)} de ${fmtNum(ov.sales)} ventas (${fmtPct(linkedPct)} del total)`}
        />
        <Row label="Facturación total del período" value={totalRev} color="#c8d5cd" />
      </div>
    </div>
  );
}
