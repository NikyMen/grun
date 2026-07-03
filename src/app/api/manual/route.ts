import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/db";
import { normPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

// Carga manual de registros individuales, con la misma normalización
// y deduplicación que la importación por Excel.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.kind || !body?.data) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }
  const db = getDb();
  const d = body.data as Record<string, string>;
  const md5 = (s: string) => crypto.createHash("md5").update(s).digest("hex");

  try {
    if (body.kind === "contacto") {
      if (!d.name) return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
      const created = d.created_at ? d.created_at.replace("T", " ") + (d.created_at.length === 16 ? ":00" : "") : new Date().toISOString().slice(0, 19).replace("T", " ");
      const r = db.prepare(`
        INSERT OR IGNORE INTO contacts (crm_id, name, phone, phone_raw, branch, created_at, source_file)
        VALUES (?, ?, ?, ?, ?, ?, 'manual')
      `).run(md5(`${d.name}|${d.phone || ""}|${created}`), d.name, normPhone(d.phone), d.phone || "", d.branch || "", created);
      return result(r.changes);
    }
    if (body.kind === "venta") {
      if (!d.client || !d.amount) return NextResponse.json({ error: "Cliente e importe son obligatorios" }, { status: 400 });
      const amount = parseFloat(d.amount) || 0;
      const r = db.prepare(`
        INSERT OR IGNORE INTO sales (uniq_hash, branch, client, phone, phone_raw, last_sale_date, amount, invoices, source_file)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'manual')
      `).run(
        md5(`${d.branch || ""}|${d.client}|${d.phone || ""}|${d.date || ""}|${amount}`),
        d.branch || "", d.client, normPhone(d.phone), d.phone || "", d.date || "", amount, parseInt(d.invoices) || 1
      );
      return result(r.changes);
    }
    if (body.kind === "pauta") {
      if (!d.campaign) return NextResponse.json({ error: "La campaña es obligatoria" }, { status: 400 });
      const rec = [
        d.campaign, d.adset || "All", "All", "All",
        parseFloat(d.reach) || 0, parseFloat(d.impressions) || 0,
        d.resultType || "Conversaciones con mensajes iniciadas", parseFloat(d.results) || 0,
        parseFloat(d.spend) || 0,
        (parseFloat(d.results) || 0) > 0 ? (parseFloat(d.spend) || 0) / parseFloat(d.results) : 0,
        d.startDate || "", d.endDate || "",
      ];
      const level = !d.adset || d.adset === "All" ? "campaign" : "adset";
      const r = db.prepare(`
        INSERT OR IGNORE INTO meta_rows (uniq_hash, campaign, adset, age, sex, reach, impressions, result_type, results, spend, cost_per_result, start_date, end_date, level, source_file)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual')
      `).run(md5(rec.join("|")), ...rec, level);
      return result(r.changes);
    }
    return NextResponse.json({ error: "Tipo desconocido" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

function result(changes: number) {
  return changes > 0
    ? NextResponse.json({ ok: true, message: "Registro guardado" })
    : NextResponse.json({ ok: false, message: "Registro duplicado: ya existía y no se volvió a cargar" });
}
