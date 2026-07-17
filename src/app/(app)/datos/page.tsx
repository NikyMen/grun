"use client";

/* Datos: importación de Excel (detección automática de hojas), carga manual e historial.
   Cada subida arma un bloque con nombre propio: los datos son fríos y se comparan
   bloque contra bloque, no por rango de fechas. */

import { useEffect, useRef, useState } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, PlusCircle, History, Layers, Trash2, Pencil, Download, Eye, X, Loader2 } from "lucide-react";

function fmtSize(bytes: number) {
  if (!bytes) return "—";
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DatosPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [log, setLog] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [preview, setPreview] = useState<any>(null);
  const [blockName, setBlockName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadLog = () =>
    fetch("/api/metrics?section=importlog").then((r) => r.json()).then(setLog).catch(() => {});
  const loadBlocks = () =>
    fetch("/api/metrics?section=blocks").then((r) => r.json()).then(setBlocks).catch(() => {});
  const loadFiles = () =>
    fetch("/api/metrics?section=files").then((r) => r.json()).then(setFiles).catch(() => {});

  useEffect(() => { loadLog(); loadBlocks(); loadFiles(); }, []);

  async function upload(files: FileList | File[]) {
    if (!blockName.trim()) {
      setError("Antes de subir, ponele un nombre al bloque.");
      return;
    }
    setError("");
    setResult(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("blockName", blockName.trim());
      for (const f of Array.from(files)) form.append("file", f);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Error al importar");
      else { setResult(data); setBlockName(""); }
      loadLog();
      loadBlocks();
      loadFiles();
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
          Subí los Excel de Meta y del CRM/ventas, o cargá registros a mano. Cada subida forma un
          bloque con el nombre que le pongas, y después el Informe se mira bloque por bloque.
          Los duplicados dentro de un bloque se detectan solos: nada se pisa ni se repite.
        </p>
      </header>

      {/* Nombre del bloque */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <label className="flex items-center gap-2 text-sm font-bold text-grun-950 mb-2">
          <Layers size={15} /> Nombre del bloque
        </label>
        <input
          value={blockName}
          onChange={(e) => setBlockName(e.target.value)}
          placeholder="Ej: Campaña invierno · junio 2026"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-grun-500"
        />
        <p className="mt-1.5 text-xs text-gray-400">
          Todos los archivos que subas juntos quedan agrupados bajo este nombre.
        </p>
      </div>

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
          {uploading
            ? "Importando…"
            : blockName.trim()
              ? `Arrastrá acá los Excel del bloque “${blockName.trim()}”`
              : "Arrastrá acá tus Excel o hacé clic para elegirlos"}
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
            <CheckCircle2 size={16} className="text-grun-600" /> Bloque “{result.block?.name}” creado
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

      {/* Bloques cargados */}
      <BlocksPanel blocks={blocks} reload={() => { loadBlocks(); loadLog(); loadFiles(); }} />

      {/* Archivos originales */}
      <FilesPanel files={files} onView={setPreview} />

      {/* Carga manual */}
      <ManualForms blocks={blocks} />

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
                  <th className="py-2 pr-3 font-medium">Bloque</th>
                  <th className="py-2 pr-3 font-medium">Archivo</th>
                  <th className="py-2 pr-3 font-medium"></th>
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
                    <td className="py-1.5 pr-3 text-grun-800 font-medium">{r.blockName || "—"}</td>
                    <td className="py-1.5 pr-3 font-medium text-grun-950 max-w-[220px] truncate">{r.file}</td>
                    <td className="py-1.5 pr-3 whitespace-nowrap">
                      {r.file_id ? (
                        <span className="flex gap-1">
                          <button onClick={() => setPreview({ id: r.file_id, name: r.file })} title="Ver contenido" className="p-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">
                            <Eye size={12} />
                          </button>
                          <a href={`/api/files?id=${r.file_id}`} title="Descargar Excel original" className="p-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">
                            <Download size={12} />
                          </a>
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">sin archivo</span>
                      )}
                    </td>
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

      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

/* Archivos tal como se subieron: se pueden ver en pantalla o descargar. */
function FilesPanel({ files, onView }: { files: any[]; onView: (f: any) => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-grun-950 mb-2">
        <FileSpreadsheet size={15} /> Archivos importados
      </h3>
      {files.length === 0 ? (
        <p className="text-sm text-gray-400">
          Todavía no hay archivos guardados. Los Excel que subas de acá en adelante quedan
          disponibles para ver y descargar.
        </p>
      ) : (
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="py-2 pr-3 font-medium">Archivo</th>
                <th className="py-2 pr-3 font-medium">Bloque</th>
                <th className="py-2 pr-3 font-medium">Subido</th>
                <th className="py-2 pr-3 font-medium text-right">Tamaño</th>
                <th className="py-2 pr-3 font-medium text-right">Hojas</th>
                <th className="py-2 pr-3 font-medium text-right">Filas nuevas</th>
                <th className="py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-grun-50/50">
                  <td className="py-2 pr-3 font-medium text-grun-950 max-w-[260px] truncate" title={f.name}>{f.name}</td>
                  <td className="py-2 pr-3 text-grun-800">{f.blockName || "—"}</td>
                  <td className="py-2 pr-3 text-xs text-gray-500">{f.created_at}</td>
                  <td className="py-2 pr-3 text-right text-gray-600">{fmtSize(f.size)}</td>
                  <td className="py-2 pr-3 text-right">{f.sheets}</td>
                  <td className="py-2 pr-3 text-right font-semibold text-grun-700">{f.inserted}</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => onView(f)} title="Ver contenido" className="flex items-center gap-1 p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600">
                        <Eye size={13} />
                      </button>
                      <a href={`/api/files?id=${f.id}`} title="Descargar Excel original" className="flex items-center gap-1 p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600">
                        <Download size={13} />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* Vista rápida del Excel sin salir de la app: primeras filas de cada hoja. */
function PreviewModal({ file, onClose }: { file: any; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [sheet, setSheet] = useState(0);

  useEffect(() => {
    setData(null);
    setErr("");
    setSheet(0);
    fetch(`/api/files?id=${file.id}&mode=view`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "No se pudo abrir el archivo");
        return d;
      })
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [file.id]);

  const current = data?.sheets?.[sheet];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-grun-950 truncate">{data?.name || file.name}</h3>
            <p className="text-xs text-gray-400">
              {data ? `${data.sheets.length} hoja(s) · ${fmtSize(data.size)}` : "Abriendo el archivo…"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href={`/api/files?id=${file.id}`} className="flex items-center gap-1.5 rounded-lg bg-grun-700 hover:bg-grun-600 text-white text-xs font-semibold px-3 py-2">
              <Download size={13} /> Descargar
            </a>
            <button onClick={onClose} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500" title="Cerrar">
              <X size={14} />
            </button>
          </div>
        </div>

        {data && data.sheets.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto border-b border-gray-100 px-4 py-2">
            {data.sheets.map((sh: any, i: number) => (
              <button
                key={i}
                onClick={() => setSheet(i)}
                className={`whitespace-nowrap text-xs font-semibold rounded-lg px-3 py-1.5 transition-colors ${
                  i === sheet ? "bg-grun-800 text-lima" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {sh.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          {err && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle size={15} /> {err}
            </div>
          )}
          {!data && !err && (
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin" /> Leyendo el Excel…
            </p>
          )}
          {current && (
            <>
              {current.truncated && (
                <p className="mb-2 text-xs text-amber-700">
                  Vista parcial: se muestran las primeras filas de {current.totalRows}. Descargá el
                  archivo para verlo completo.
                </p>
              )}
              <table className="text-xs border-collapse">
                <tbody>
                  {current.rows.map((row: string[], ri: number) => (
                    <tr key={ri} className={ri === 0 ? "bg-grun-50 font-semibold text-grun-900" : "hover:bg-gray-50"}>
                      {row.map((cell: string, ci: number) => (
                        <td key={ci} className="border border-gray-100 px-2 py-1 max-w-[220px] truncate" title={cell}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {current.rows.length === 0 && <p className="text-sm text-gray-400">La hoja está vacía.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BlocksPanel({ blocks, reload }: { blocks: any[]; reload: () => void }) {
  async function rename(b: any) {
    const name = prompt("Nuevo nombre del bloque", b.name);
    if (!name?.trim() || name.trim() === b.name) return;
    await fetch("/api/blocks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, name: name.trim() }),
    });
    reload();
  }

  async function remove(b: any) {
    if (!confirm(`¿Borrar el bloque “${b.name}” y todos sus datos? No se puede deshacer.`)) return;
    await fetch(`/api/blocks?id=${b.id}`, { method: "DELETE" });
    reload();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-grun-950 mb-2">
        <Layers size={15} /> Bloques cargados
      </h3>
      {blocks.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no hay bloques. Subí tus Excel para crear el primero.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="py-2 pr-3 font-medium">Bloque</th>
                <th className="py-2 pr-3 font-medium">Creado</th>
                <th className="py-2 pr-3 font-medium text-right">Pauta</th>
                <th className="py-2 pr-3 font-medium text-right">Contactos</th>
                <th className="py-2 pr-3 font-medium text-right">Ventas</th>
                <th className="py-2 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((b) => (
                <tr key={b.id} className="border-b border-gray-50 hover:bg-grun-50/50">
                  <td className="py-2 pr-3 font-semibold text-grun-950">{b.name}</td>
                  <td className="py-2 pr-3 text-xs text-gray-500">{b.created_at}</td>
                  <td className="py-2 pr-3 text-right">{b.metaRows}</td>
                  <td className="py-2 pr-3 text-right">{b.contacts}</td>
                  <td className="py-2 pr-3 text-right">{b.sales}</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => rename(b)} title="Renombrar" className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => remove(b)} title="Borrar bloque" className="p-1.5 rounded-md border border-gray-200 hover:bg-red-50 hover:border-red-300 text-red-600">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ManualForms({ blocks }: { blocks: any[] }) {
  const [tab, setTab] = useState<"contacto" | "venta" | "pauta">("contacto");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [blockId, setBlockId] = useState("");

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
        body: JSON.stringify({ kind: tab, data, blockId: blockId || undefined }),
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
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-grun-950">
          <PlusCircle size={15} /> Carga manual
        </h3>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          Bloque
          <select
            value={blockId}
            onChange={(e) => setBlockId(e.target.value)}
            className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs outline-none focus:border-grun-500 max-w-[220px]"
          >
            <option value="">Carga manual</option>
            {blocks.map((b: any) => (
              <option key={b.id} value={String(b.id)}>{b.name}</option>
            ))}
          </select>
        </label>
      </div>
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
