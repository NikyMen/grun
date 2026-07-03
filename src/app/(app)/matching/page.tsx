"use client";

/* Cruce conversación → compra: la métrica estrella de la reunión con el cliente */

import { useEffect, useState } from "react";
import { Percent, Users, ShoppingBag, Banknote, AlertTriangle } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import Filters, { FilterValues, filtersToQuery } from "@/components/Filters";
import AiInsight from "@/components/AiInsight";
import { fmtMoney, fmtNum, fmtPct } from "@/lib/fmt";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function MatchingPage() {
  const [f, setF] = useState<FilterValues>({});
  const [data, setData] = useState<any>(null);
  const [ov, setOv] = useState<any>(null);

  useEffect(() => {
    const q = filtersToQuery(f);
    Promise.all([
      fetch(`/api/metrics?section=matching&${q}`).then((r) => r.json()),
      fetch(`/api/metrics?section=overview&${q}`).then((r) => r.json()),
    ])
      .then(([m, o]) => { setData(m); setOv(o); })
      .catch(() => {});
  }, [f]);

  const maxFunnel = data?.funnel?.[0]?.value || 1;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black text-grun-950">Cruce y conversión</h1>
        <p className="text-sm text-gray-500">
          ¿Qué porcentaje de los que escriben termina comprando? Cruce por teléfono, sin duplicados
        </p>
      </header>

      <Filters value={f} onChange={setF} show={["dates", "branch"]} />

      {ov && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Conversación → compra" value={fmtPct(ov.conversionRate)} hint="contactos con teléfono que compraron" icon={Percent} accent />
          <KpiCard label="Contactos con teléfono" value={fmtNum(ov.contactsWithPhone)} icon={Users} />
          <KpiCard label="Compradores cruzados" value={fmtNum(ov.matchedPhones)} icon={ShoppingBag} />
          <KpiCard label="Facturación atribuida" value={fmtMoney(ov.matchedRevenue)} icon={Banknote} />
        </div>
      )}

      <AiInsight section="matching" filters={f} />

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Embudo */}
        {data?.funnel && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-grun-950">Embudo: de la pauta a la compra</h3>
            <p className="text-xs text-gray-400 mb-4">Cada etapa como % de la anterior</p>
            <div className="space-y-3">
              {data.funnel.map((s: any, i: number) => {
                const prev = i > 0 ? data.funnel[i - 1].value : s.value;
                const pctOfPrev = prev > 0 ? (s.value / prev) * 100 : 0;
                const width = Math.max((s.value / maxFunnel) * 100, 2);
                return (
                  <div key={s.stage}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-grun-900">{s.stage}</span>
                      <span className="text-gray-500">
                        {fmtNum(s.value)}
                        {i > 0 && <span className="ml-1.5 text-grun-700 font-semibold">({pctOfPrev.toFixed(1).replace(".", ",")}%)</span>}
                      </span>
                    </div>
                    <div className="h-6 bg-gray-100 rounded-md overflow-hidden">
                      <div
                        className="h-full rounded-md transition-all"
                        style={{
                          width: `${width}%`,
                          background: i === data.funnel.length - 1 ? "#c9f158" : `rgba(38,115,81,${1 - i * 0.16})`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Conversión por línea */}
        {data?.byContactBranch?.length ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-grun-950">Conversión por línea de atención</h3>
            <p className="text-xs text-gray-400 mb-2">Tasa de contactos que contestan y luego compran</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="py-2 font-medium">Línea</th>
                  <th className="py-2 font-medium text-right">Contactos</th>
                  <th className="py-2 font-medium text-right">Compraron</th>
                  <th className="py-2 font-medium text-right">Conversión</th>
                  <th className="py-2 font-medium text-right">Facturación</th>
                </tr>
              </thead>
              <tbody>
                {data.byContactBranch.map((r: any, i: number) => {
                  const pct = r.contacts ? (r.buyers / r.contacts) * 100 : 0;
                  return (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 font-medium text-grun-950">{r.branch}</td>
                      <td className="py-2 text-right">{fmtNum(r.contacts)}</td>
                      <td className="py-2 text-right">{fmtNum(r.buyers)}</td>
                      <td className="py-2 text-right">
                        <span className={`font-bold ${pct >= 5 ? "text-grun-700" : "text-gray-500"}`}>{fmtPct(pct)}</span>
                      </td>
                      <td className="py-2 text-right">{fmtMoney(r.revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      {/* Calidad de datos */}
      {data?.quality && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <AlertTriangle size={15} /> Calidad de datos (limita la atribución)
          </h3>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><p className="text-2xl font-bold text-amber-900">{fmtNum(data.quality.contactsNoPhone)}</p><p className="text-xs text-amber-800">contactos sin teléfono (imposibles de cruzar)</p></div>
            <div><p className="text-2xl font-bold text-amber-900">{fmtNum(data.quality.salesNoPhone)}</p><p className="text-xs text-amber-800">ventas sin teléfono cargado</p></div>
            <div><p className="text-2xl font-bold text-amber-900">{fmtNum(data.quality.dupContactPhones)}</p><p className="text-xs text-amber-800">teléfonos repetidos en contactos (unificados en el cruce)</p></div>
            <div><p className="text-2xl font-bold text-amber-900">{fmtNum(data.quality.dupSalePhones)}</p><p className="text-xs text-amber-800">teléfonos repetidos en ventas (clientes recurrentes)</p></div>
          </div>
        </div>
      )}

      {/* Detalle de matches */}
      {data?.matches?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-grun-950">
              Compras cruzadas <span className="text-gray-400 font-normal">({data.matches.length})</span>
            </h3>
            <span className="text-xs text-gray-400">conversación en el CRM + venta con el mismo teléfono</span>
          </div>
          <div className="overflow-x-auto mt-2 max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-2 font-medium">Contacto (CRM)</th>
                  <th className="px-4 py-2 font-medium">Teléfono</th>
                  <th className="px-4 py-2 font-medium">Escribió</th>
                  <th className="px-4 py-2 font-medium">Cliente (ventas)</th>
                  <th className="px-4 py-2 font-medium">Sucursal</th>
                  <th className="px-4 py-2 font-medium">Última compra</th>
                  <th className="px-4 py-2 font-medium text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {data.matches.map((m: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-grun-50/50">
                    <td className="px-4 py-2 font-medium text-grun-950">{m.contactName || "—"}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs font-mono">{m.phone}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{(m.contactedAt || "").slice(0, 10)}</td>
                    <td className="px-4 py-2 text-gray-700">{m.client}</td>
                    <td className="px-4 py-2 text-gray-600">{m.saleBranch}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{m.saleDate}</td>
                    <td className="px-4 py-2 text-right font-semibold">{fmtMoney(m.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">Todavía no hay compras cruzadas para los filtros elegidos.</p>
      )}
    </div>
  );
}
