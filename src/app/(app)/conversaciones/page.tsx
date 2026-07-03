"use client";

/* Conversaciones del CRM: volumen, horarios, líneas y captura de teléfono */

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Users, Phone, PhoneOff, Clock } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import Filters, { FilterValues, filtersToQuery } from "@/components/Filters";
import AiInsight from "@/components/AiInsight";
import { ChartCard, Heatmap, GREEN, LIME, EmptyState } from "@/components/charts";
import { fmtNum, fmtPct, DOW } from "@/lib/fmt";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ConversacionesPage() {
  const [f, setF] = useState<FilterValues>({});
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/metrics?section=conversaciones&${filtersToQuery(f)}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [f]);

  const totals = useMemo(() => {
    const rows = data?.byBranch || [];
    const total = rows.reduce((a: number, r: any) => a + r.contacts, 0);
    const withPhone = rows.reduce((a: number, r: any) => a + (r.withPhone || 0), 0);
    let peak = { hour: 0, contacts: 0 };
    for (const h of data?.byHour || []) if (h.contacts > peak.contacts) peak = h;
    return { total, withPhone, pct: total ? (withPhone / total) * 100 : 0, peak };
  }, [data]);

  const dowData = useMemo(
    () => (data?.byDow || []).map((r: any) => ({ ...r, dia: DOW[r.dow] })),
    [data]
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-black text-grun-950">Conversaciones</h1>
        <p className="text-sm text-gray-500">Contactos que escriben por WhatsApp desde la pauta (CRM Kommo)</p>
      </header>

      <Filters value={f} onChange={setF} show={["dates", "branch"]} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Conversaciones" value={fmtNum(totals.total)} icon={Users} accent />
        <KpiCard label="Con teléfono" value={fmtNum(totals.withPhone)} hint={`${fmtPct(totals.pct)} de captura`} icon={Phone} />
        <KpiCard label="Sin teléfono" value={fmtNum(totals.total - totals.withPhone)} hint="no se pueden cruzar con ventas" icon={PhoneOff} />
        <KpiCard label="Hora pico" value={`${totals.peak.hour}:00`} hint={`${fmtNum(totals.peak.contacts)} conversaciones`} icon={Clock} />
      </div>

      <AiInsight section="conversaciones" filters={f} />

      <div className="grid lg:grid-cols-2 gap-4">
        {data?.byDay?.length ? (
          <ChartCard title="Conversaciones por día" subtitle="Evolución diaria de contactos nuevos">
            <AreaChart data={data.byDay} margin={{ left: 0, right: 10 }}>
              <defs>
                <linearGradient id="gConv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GREEN} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={GREEN} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area dataKey="contacts" name="Conversaciones" stroke={GREEN} strokeWidth={2} fill="url(#gConv)" />
            </AreaChart>
          </ChartCard>
        ) : (
          <EmptyState />
        )}

        {dowData.length ? (
          <ChartCard title="Conversaciones por día de semana" subtitle="¿Qué días escriben más?">
            <BarChart data={dowData} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="contacts" name="Conversaciones" fill={GREEN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>
        ) : (
          <EmptyState />
        )}
      </div>

      {data?.byHour?.length ? (
        <ChartCard title="Conversaciones por hora del día" subtitle="Reforzá la atención en los picos: cada conversación sin responder es plata de pauta perdida" height={220}>
          <BarChart data={data.byHour} margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" />
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(h) => `${h}h`} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip labelFormatter={(h) => `${h}:00 a ${h}:59`} />
            <Bar dataKey="contacts" name="Conversaciones" fill={LIME} stroke={GREEN} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>
      ) : null}

      {data?.heatmap?.length ? (
        <Heatmap
          data={data.heatmap}
          title="Mapa de calor: día × hora"
          subtitle="Concentración de conversaciones por día de semana y hora"
        />
      ) : null}

      <div className="grid lg:grid-cols-2 gap-4">
        {data?.byBranch?.length ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-grun-950">Por línea / responsable</h3>
            <p className="text-xs text-gray-400 mb-2">La captura de teléfono define cuánto se puede atribuir a ventas</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="py-2 font-medium">Línea</th>
                  <th className="py-2 font-medium text-right">Conversaciones</th>
                  <th className="py-2 font-medium text-right">Con teléfono</th>
                  <th className="py-2 font-medium text-right">% captura</th>
                </tr>
              </thead>
              <tbody>
                {data.byBranch.map((r: any, i: number) => {
                  const pct = r.contacts ? (r.withPhone / r.contacts) * 100 : 0;
                  return (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2 font-medium text-grun-950">{r.branch}</td>
                      <td className="py-2 text-right">{fmtNum(r.contacts)}</td>
                      <td className="py-2 text-right">{fmtNum(r.withPhone)}</td>
                      <td className={`py-2 text-right font-semibold ${pct < 80 ? "text-amber-600" : "text-grun-700"}`}>{fmtPct(pct, 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {data?.recent?.length ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-grun-950 mb-2">Últimas conversaciones</h3>
            <div className="max-h-[340px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="py-2 font-medium">Contacto</th>
                    <th className="py-2 font-medium">Teléfono</th>
                    <th className="py-2 font-medium">Fecha</th>
                    <th className="py-2 font-medium text-right">¿Compró?</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((r: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1.5 font-medium text-grun-950 max-w-[160px] truncate">{r.name || "—"}</td>
                      <td className="py-1.5 text-gray-500 text-xs">{r.phone || "sin teléfono"}</td>
                      <td className="py-1.5 text-gray-500 text-xs">{(r.created_at || "").slice(0, 16)}</td>
                      <td className="py-1.5 text-right">
                        {r.bought ? (
                          <span className="text-[10px] font-bold bg-lima text-grun-950 rounded-full px-2 py-0.5">SÍ ✓</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">no</span>
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
    </div>
  );
}
