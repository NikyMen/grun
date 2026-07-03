"use client";

/* Datos: importación de Excel (detección automática de hojas), carga manual e historial */

import { useEffect, useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, PlusCircle, History } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DatosPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [log, setLog] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadLog = () =>
    fetch("/api/metrics?section=importlog").then((r) => r.json()).then(setLog).catch(() => {});

  useEffect(() => { loadLog(); }, []);

  async function upload(files: FileList | File[]) {
    setError("");
    setResult(null);
    setUploading(true);
    try {
      const form = new FormData();
      for (const f of Array.from(files)) form.append("file", f);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Error al importar");
      else setResult(data);
      loadLog();
    } catch {
      setError("No se pudo subir el archivo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-black text-grun-950">Datos</h1>
        <p className="text-sm text-gray-500">
          Subí los Excel de Meta y del CRM/ventas, o cargá registros a mano. Los duplicados se detectan solos: nada se pisa ni se repite.
        </p>
      </header>

      {/* Subida de Excel */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) upload(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-grun-500 bg-grun-50" : "border-gray-300 bg-white hover:border-grun-400"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          multiple
          className="hidden"
          onChange={(e) => e.target.files?.length && upload(e.target.files)}
        />
        <UploadCloud className="mx-auto text-grun-500" size={36} />
        <p className="mt-3 text-sm font-semibold text-grun-950">
          {uploading ? "Importando…" : "Arrastrá acá tus Excel o hacé clic para elegirlos"}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Acepta .xlsx: informe de Meta (Creative Reporting), contactos del CRM y ventas Power BI.
          Detecta cada hoja automáticamente.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {result?.imports && (
        <div className="rounded-xl border border-grun-200 bg-grun-50 p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-grun-900">
            <CheckCircle2 size={16} className="text-grun-600" /> Importación completada
          </h3>
          <div className="mt-2 space-y-1.5">
            {result.imports.flatMap((imp: any) =>
              imp.results.map((r: any, i: number) => (
                <div key={`${imp.file}-${i}`} className="flex flex-wrap items-center gap-2 text-sm text-grun-900">
                  <FileSpreadsheet size={14} className="text-grun-600" />
                  <span className="font-medium">{imp.file}</span>
                  <span className="text-gray-400">›</span>
                  <span>{r.sheet}</span>
                  <span className="text-[10px] font-bold uppercase bg-grun-800 text-lima rounded px-1.5 py-0.5">{r.kind}</span>
                  <span className="text-grun-700 font-semibold">{r.inserted} nuevos</span>
                  {r.duplicates > 0 && <span className="text-amber-700">{r.duplicates} duplicados omitidos</span>}
                </div>
              ))
            )}
            {result.imports.every((i: any) => i.results.length === 0) && (
              <p className="text-sm text-amber-700">No se reconoció ninguna hoja con datos. Revisá que el Excel tenga los encabezados originales.</p>
            )}
          </div>
        </div>
      )}

      {/* Carga manual */}
      <ManualForms />

      {/* Historial */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-grun-950 mb-2">
          <History size={15} /> Historial de importaciones
        </h3>
        {log.length === 0 ? (
          <p className="text-sm text-gray-400">Todavía no se importó nada.</p>
        ) : (
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="py-2 pr-3 font-medium">Fecha</th>
                  <th className="py-2 pr-3 font-medium">Archivo</th>
                  <th className="py-2 pr-3 font-medium">Hoja</th>
                  <th className="py-2 pr-3 font-medium">Tipo</th>
                  <th className="py-2 pr-3 font-medium text-right">Nuevos</th>
                  <th className="py-2 font-medium text-right">Duplicados</th>
                </tr>
              </thead>
              <tbody>
                {log.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-1.5 pr-3 text-gray-500 text-xs">{r.created_at}</td>
                    <td className="py-1.5 pr-3 font-medium text-grun-950 max-w-[220px] truncate">{r.file}</td>
                    <td className="py-1.5 pr-3 text-gray-600">{r.sheet}</td>
                    <td className="py-1.5 pr-3"><span className="text-[10px] font-bold uppercase bg-grun-100 text-grun-800 rounded px-1.5 py-0.5">{r.kind}</span></td>
                    <td className="py-1.5 pr-3 text-right font-semibold text-grun-700">{r.inserted}</td>
                    <td className="py-1.5 text-right text-amber-600">{r.duplicates}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ManualForms() {
  const [tab, setTab] = useState<"contacto" | "venta" | "pauta">("contacto");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const res = await fetch("/api/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: tab, data }),
      });
      const d = await res.json();
      setMsg({ ok: res.ok && d.ok !== false, text: d.message || d.error || "Listo" });
      if (res.ok && d.ok !== false) form.reset();
    } catch {
      setMsg({ ok: false, text: "Error de conexión" });
    } finally {
      setSaving(false);
    }
  }

  const input = "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-grun-500 w-full";
  const label = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-grun-950 mb-3">
        <PlusCircle size={15} /> Carga manual
      </h3>
      <div className="flex gap-2 mb-4">
        {(["contacto", "venta", "pauta"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setMsg(null); }}
            className={`text-xs font-semibold rounded-lg px-3.5 py-2 capitalize transition-colors ${
              tab === t ? "bg-grun-800 text-lima" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t === "pauta" ? "Pauta Meta" : t}
          </button>
        ))}
      </div>

      <form onSubmit={submit} key={tab} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tab === "contacto" && (
          <>
            <div className="col-span-2"><label className={label}>Nombre *</label><input name="name" required className={input} /></div>
            <div><label className={label}>Teléfono</label><input name="phone" className={input} placeholder="+549..." /></div>
            <div><label className={label}>Línea / responsable</label><input name="branch" className={input} /></div>
            <div className="col-span-2"><label className={label}>Fecha y hora</label><input name="created_at" type="datetime-local" className={input} /></div>
          </>
        )}
        {tab === "venta" && (
          <>
            <div className="col-span-2"><label className={label}>Cliente *</label><input name="client" required className={input} /></div>
            <div><label className={label}>Teléfono</label><input name="phone" className={input} /></div>
            <div><label className={label}>Sucursal</label><input name="branch" className={input} /></div>
            <div><label className={label}>Fecha</label><input name="date" type="date" className={input} /></div>
            <div><label className={label}>Importe (ARS) *</label><input name="amount" type="number" step="0.01" required className={input} /></div>
            <div><label className={label}>Facturas</label><input name="invoices" type="number" defaultValue={1} className={input} /></div>
          </>
        )}
        {tab === "pauta" && (
          <>
            <div className="col-span-2"><label className={label}>Campaña *</label><input name="campaign" required className={input} /></div>
            <div className="col-span-2"><label className={label}>Conjunto de anuncios</label><input name="adset" className={input} /></div>
            <div><label className={label}>Alcance</label><input name="reach" type="number" className={input} /></div>
            <div><label className={label}>Impresiones</label><input name="impressions" type="number" className={input} /></div>
            <div><label className={label}>Resultados</label><input name="results" type="number" className={input} /></div>
            <div><label className={label}>Gasto (ARS)</label><input name="spend" type="number" step="0.01" className={input} /></div>
            <div><label className={label}>Tipo de resultado</label><input name="resultType" className={input} placeholder="Conversaciones con mensajes iniciadas" /></div>
            <div><label className={label}>Inicio</label><input name="startDate" type="date" className={input} /></div>
            <div><label className={label}>Fin</label><input name="endDate" type="date" className={input} /></div>
          </>
        )}
        <div className="col-span-2 md:col-span-4 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-grun-700 hover:bg-grun-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 transition-colors"
          >
            {saving ? "Guardando…" : "Guardar registro"}
          </button>
          {msg && (
            <span className={`text-sm ${msg.ok ? "text-grun-700" : "text-amber-700"}`}>{msg.text}</span>
          )}
        </div>
      </form>
    </div>
  );
}
