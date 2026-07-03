import type { LucideIcon } from "lucide-react";

export default function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 border shadow-sm ${
        accent ? "bg-grun-900 border-grun-800 text-white" : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs font-medium uppercase tracking-wide ${accent ? "text-grun-300" : "text-gray-500"}`}>
          {label}
        </p>
        {Icon && <Icon size={16} className={accent ? "text-lima" : "text-grun-500"} />}
      </div>
      <p className={`mt-1.5 text-2xl font-bold ${accent ? "text-lima" : "text-grun-950"}`}>{value}</p>
      {hint && <p className={`mt-0.5 text-xs ${accent ? "text-grun-300" : "text-gray-400"}`}>{hint}</p>}
    </div>
  );
}
