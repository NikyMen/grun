"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, X, Layers } from "lucide-react";

export type FilterValues = {
  block?: string;
  campaign?: string;
  adset?: string;
  age?: string;
  sex?: string;
  resultType?: string;
  branch?: string;
};

type Block = { id: number; name: string; created_at: string };

type Options = {
  blocks: Block[];
  campaigns: string[];
  adsets: string[];
  ages: string[];
  sexes: string[];
  resultTypes: string[];
  contactBranches: string[];
  saleBranches: string[];
};

export function filtersToQuery(f: FilterValues): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  return p.toString();
}

const SEX_LABEL: Record<string, string> = { male: "Hombres", female: "Mujeres", unknown: "Sin datos" };

export default function Filters({
  value,
  onChange,
  show,
  branchSource = "contacts",
}: {
  value: FilterValues;
  onChange: (f: FilterValues) => void;
  show: ("block" | "campaign" | "adset" | "age" | "sex" | "resultType" | "branch")[];
  branchSource?: "contacts" | "sales";
}) {
  const [options, setOptions] = useState<Options | null>(null);

  useEffect(() => {
    fetch("/api/metrics?section=filters")
      .then((r) => r.json())
      .then(setOptions)
      .catch(() => {});
  }, []);

  const set = (k: keyof FilterValues, v: string) =>
    onChange({ ...value, [k]: v || undefined });

  const hasActive = Object.values(value).some(Boolean);
  const branches =
    branchSource === "sales" ? options?.saleBranches : options?.contactBranches;

  const sel =
    "rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-grun-500 max-w-[180px]";

  return (
    <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-grun-800 mr-1">
        <SlidersHorizontal size={14} /> Filtros
      </span>
      {show.includes("block") && (
        <label className="flex items-center gap-1.5">
          <Layers size={13} className="text-grun-700" />
          <select
            value={value.block || ""}
            onChange={(e) => set("block", e.target.value)}
            className={`${sel} max-w-[240px]`}
            title="Bloque de datos"
          >
            <option value="">Todos los bloques</option>
            {options?.blocks.map((b) => (
              <option key={b.id} value={String(b.id)}>{b.name}</option>
            ))}
          </select>
        </label>
      )}
      {show.includes("campaign") && (
        <select value={value.campaign || ""} onChange={(e) => set("campaign", e.target.value)} className={sel}>
          <option value="">Todas las campañas</option>
          {options?.campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      {show.includes("adset") && (
        <select value={value.adset || ""} onChange={(e) => set("adset", e.target.value)} className={sel}>
          <option value="">Todos los conjuntos</option>
          {options?.adsets.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      {show.includes("age") && (
        <select value={value.age || ""} onChange={(e) => set("age", e.target.value)} className={sel}>
          <option value="">Todas las edades</option>
          {options?.ages.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      {show.includes("sex") && (
        <select value={value.sex || ""} onChange={(e) => set("sex", e.target.value)} className={sel}>
          <option value="">Ambos sexos</option>
          {options?.sexes.map((c) => <option key={c} value={c}>{SEX_LABEL[c] || c}</option>)}
        </select>
      )}
      {show.includes("resultType") && (
        <select value={value.resultType || ""} onChange={(e) => set("resultType", e.target.value)} className={sel}>
          <option value="">Todos los resultados</option>
          {options?.resultTypes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      {show.includes("branch") && (
        <select value={value.branch || ""} onChange={(e) => set("branch", e.target.value)} className={sel}>
          <option value="">{branchSource === "sales" ? "Todas las sucursales" : "Todas las líneas"}</option>
          {branches?.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      )}
      {hasActive && (
        <button
          onClick={() => onChange({})}
          className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium ml-1"
        >
          <X size={13} /> Limpiar
        </button>
      )}
    </div>
  );
}
