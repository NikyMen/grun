"use client";

import { useState } from "react";
import { Sparkles, ThumbsUp, ThumbsDown, RefreshCw } from "lucide-react";
import { mdToHtml } from "@/lib/fmt";
import type { FilterValues } from "./Filters";

// Botón de análisis con IA por sección: calcula los agregados reales en el
// servidor y le pide a Claude recomendaciones basadas solo en esos números.
export default function AiInsight({
  section,
  filters = {},
}: {
  section: string;
  filters?: FilterValues;
}) {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<{ id: number; content: string } | null>(null);
  const [rated, setRated] = useState(0);

  async function generate() {
    setLoading(true);
    setRated(0);
    try {
      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, filters }),
      });
      setInsight(await res.json());
    } catch {
      setInsight({ id: 0, content: "⚠️ No se pudo generar el análisis. Intentá de nuevo." });
    } finally {
      setLoading(false);
    }
  }

  async function rate(rating: 1 | -1) {
    if (!insight?.id) return;
    setRated(rating);
    await fetch("/api/insight", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: insight.id, rating }),
    }).catch(() => {});
  }

  return (
    <div className="rounded-xl border border-lima-dark/40 bg-gradient-to-br from-lima/15 to-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-grun-700" />
          <h3 className="text-sm font-bold text-grun-900">Análisis con IA</h3>
          <span className="text-xs text-gray-400 hidden sm:inline">
            recomendaciones sobre los datos {Object.values(filters).some(Boolean) ? "filtrados" : "actuales"}
          </span>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-grun-800 hover:bg-grun-700 disabled:opacity-60 text-lima text-xs font-semibold px-3.5 py-2 transition-colors"
        >
          {loading ? (
            <>
              <RefreshCw size={13} className="animate-spin" /> Analizando datos…
            </>
          ) : insight ? (
            <>
              <RefreshCw size={13} /> Regenerar
            </>
          ) : (
            <>
              <Sparkles size={13} /> Generar análisis
            </>
          )}
        </button>
      </div>
      {insight && (
        <div className="border-t border-lima-dark/20 px-4 py-3">
          <div
            className="ai-md text-sm text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: mdToHtml(insight.content) }}
          />
          {insight.id > 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              ¿Te sirvió este análisis?
              <button
                onClick={() => rate(1)}
                className={`p-1.5 rounded-md border transition-colors ${rated === 1 ? "bg-grun-100 border-grun-400 text-grun-800" : "border-gray-200 hover:bg-gray-50"}`}
                title="Útil"
              >
                <ThumbsUp size={13} />
              </button>
              <button
                onClick={() => rate(-1)}
                className={`p-1.5 rounded-md border transition-colors ${rated === -1 ? "bg-red-50 border-red-300 text-red-700" : "border-gray-200 hover:bg-gray-50"}`}
                title="No útil"
              >
                <ThumbsDown size={13} />
              </button>
              <span className="text-gray-400">La IA usa tu feedback para afinar los próximos análisis.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
