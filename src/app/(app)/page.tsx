"use client";

/* Resumen general: inversión → conversaciones → ventas, con cruce por teléfono */

import { useEffect, useState } from "react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  AreaChart, Area, BarChart,
} from "recharts";
import { Wallet, MessageCircle, Users, ShoppingBag, TrendingUp, Percent, Target, Repeat } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import Filters, { FilterValues, filtersToQuery } from "@/components/Filters";
import AiInsight from "@/components/AiInsight";
import { ChartCard, GREEN, LIME, DARK, EmptyState } from "@/components/charts";
import { fmtMoney, fmtNum, fmtPct } from "@/lib/fmt";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function OverviewPage() {
  const [f, setF] = useState<FilterValues>({});
  const [ov, setOv] = useState<any>(null);
  const [pauta, setPauta] = useState<any>(null);
  const [conv, setConv] = useState<any>(null);
  const [ventas, setVentas] = useState<any>(null);

  useEffect(() => {
    const q = filtersToQuery(f);
    Promise.all(
      ["overview", "pauta", "conversaciones", "ventas"].map((s) =>
        fetch(`/api/metrics?section=${s}&${q}`).then((r) => r.json())
      )
    )
      .then(([o, p, c, v]) => { setOv(o); setPauta(p); setConv(c); setVentas(v); })
      .catch(() => {});
  }, [f]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-grun-950">Resumen general</h1>
          <p className="text-sm text-gray-500">Pauta Meta → conversaciones → ventas reales, cruzadas por teléfono</p>
        </div>
      </header>

      <Filters value={f} onChange={setF} show={["dates", "campaign", "branch"]} />

      {ov && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Inversión en pauta" value={fmtMoney(ov.spend)} hint={`${fmtNum(ov.impressions)} impresiones`} icon={Wallet} accent />
          <KpiCard label="Conversaciones (Meta)" value={fmtNum(ov.conversations)} hint={`costo ${fmtMoney(ov.costPerConversation)} c/u`} icon={MessageCircle} />
          <KpiCard label="Contactos CRM" value={fmtNum(ov.contacts)} hint={`${fmtNum(ov.contactsWithPhone)} con teléfono`} icon={Users} />
          <KpiCard label="Ventas" value={fmtNum(ov.sales)} hint={fmtMoney(ov.revenue)} icon={ShoppingBag} />
          <KpiCard label="Conversación → compra" value={fmtPct(ov.conversionRate)} hint={`${fmtNum(ov.matchedPhones)} compradores cruzados`} icon={Percent} accent />
          <KpiCard label="Facturación atribuida" value={fmtMoney(ov.matchedRevenue)} hint="ventas con teléfono que escribió" icon={Target} />
          <KpiCard label="Costo por cliente" value={ov.matchedPhones > 0 ? fmtMoney(ov.costPerCustomer) : "—"} hint="inversión / compradores cruzados" icon={TrendingUp} />
          <KpiCard label="Retorno atribuido" value={`${(ov.roas || 0).toFixed(2)}x`} hint="facturación atribuida / inversión" icon={Repeat} />
        </div>
      )}

      <AiInsight section="overview" filters={f} />

      <div className="grid lg:grid-cols-2 gap-4">
        {pauta?.byCampaign?.length ? (
          <ChartCard title="Inversión y resultados por campaña" subtitle="Barras: gasto ARS · Línea: resultados">
            <ComposedChart data={pauta.byCampaign} margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" />
              <XAxis dataKey="campaign" tick={{ fontSize: 10 }} interval={0} angle={-14} height={50} textAnchor="end" />
              <YAxis yAxisId="l" tick={{ fontSize: 10 }} tickFormatter={(v) => fmtNum(v)} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any, name: any) => [name === "Gasto" ? fmtMoney(v) : fmtNum(v), name]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="l" dataKey="spend" name="Gasto" fill={GREEN} radius={[4, 4, 0, 0]} />
              <Line yAxisId="r" dataKey="results" name="Resultados" stroke={DARK} strokeWidth={2} dot={{ fill: LIME, r: 4 }} />
            </ComposedChart>
          </ChartCard>
        ) : (
          <EmptyState />
        )}

        {conv?.byDay?.length ? (
          <ChartCard title="Conversaciones por día" subtitle="Contactos creados en el CRM">
            <AreaChart data={conv.byDay} margin={{ left: 0, right: 10 }}>
              <defs>
                <linearGradient id="gLima" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={LIME} stopOpacity={0.7} />
                  <stop offset="100%" stopColor={LIME} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area dataKey="contacts" name="Conversaciones" stroke={GREEN} strokeWidth={2} fill="url(#gLima)" />
            </AreaChart>
          </ChartCard>
        ) : (
          <EmptyState />
        )}

        {ventas?.byBranch?.length ? (
          <ChartCard title="Facturación por sucursal" subtitle="Ventas reales del período">
            <BarChart data={ventas.byBranch} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => fmtMoney(v)} />
              <YAxis type="category" dataKey="branch" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(v: any) => fmtMoney(v)} />
              <Bar dataKey="revenue" name="Facturación" fill={GREEN} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartCard>
        ) : (
          <EmptyState />
        )}

        {conv?.byHour?.length ? (
          <ChartCard title="Conversaciones por hora" subtitle="¿Cuándo escriben los clientes?">
            <BarChart data={conv.byHour} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2ef" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(h) => `${h}h`} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={(h) => `${h}:00 a ${h}:59`} />
              <Bar dataKey="contacts" name="Conversaciones" fill={LIME} stroke={GREEN} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
