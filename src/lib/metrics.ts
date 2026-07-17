import fs from "fs";
import path from "path";
import { getDb, uploadsDir } from "./db";

export type Filters = {
  block?: string; // id del bloque de carga; vacío = todos los bloques
  campaign?: string;
  adset?: string;
  age?: string;
  sex?: string;
  resultType?: string;
  branch?: string;
};

type Row = Record<string, unknown>;

// ---- helpers de armado de WHERE ----

function metaWhere(f: Filters, level: string) {
  const conds: string[] = ["level = ?"];
  const params: unknown[] = [level];
  if (f.block) { conds.push("block_id = ?"); params.push(Number(f.block)); }
  if (f.campaign) { conds.push("campaign = ?"); params.push(f.campaign); }
  if (f.adset) { conds.push("adset = ?"); params.push(f.adset); }
  if (f.resultType) { conds.push("result_type = ?"); params.push(f.resultType); }
  if (level === "age_sex") {
    if (f.age) { conds.push("age = ?"); params.push(f.age); }
    if (f.sex) { conds.push("sex = ?"); params.push(f.sex); }
  }
  return { where: conds.join(" AND "), params };
}

function contactsWhere(f: Filters, prefix = "") {
  const conds: string[] = ["1=1"];
  const params: unknown[] = [];
  if (f.block) { conds.push(`${prefix}block_id = ?`); params.push(Number(f.block)); }
  if (f.branch) { conds.push(`${prefix}branch = ?`); params.push(f.branch); }
  return { where: conds.join(" AND "), params };
}

function salesWhere(f: Filters, prefix = "") {
  const conds: string[] = ["1=1"];
  const params: unknown[] = [];
  if (f.block) { conds.push(`${prefix}block_id = ?`); params.push(Number(f.block)); }
  if (f.branch) { conds.push(`${prefix}branch = ?`); params.push(f.branch); }
  return { where: conds.join(" AND "), params };
}

// ---- secciones ----

export function getFilterOptions() {
  const db = getDb();
  const col = (sql: string) => (db.prepare(sql).all() as Row[]).map((r) => Object.values(r)[0] as string);
  return {
    blocks: db.prepare("SELECT id, name, created_at FROM blocks ORDER BY id DESC").all(),
    campaigns: col("SELECT DISTINCT campaign FROM meta_rows WHERE campaign != '' ORDER BY campaign"),
    adsets: col("SELECT DISTINCT adset FROM meta_rows WHERE adset NOT IN ('', 'All') ORDER BY adset"),
    ages: col("SELECT DISTINCT age FROM meta_rows WHERE age NOT IN ('', 'All') ORDER BY age"),
    sexes: col("SELECT DISTINCT sex FROM meta_rows WHERE sex NOT IN ('', 'All') ORDER BY sex"),
    resultTypes: col("SELECT DISTINCT result_type FROM meta_rows WHERE result_type != '' ORDER BY result_type"),
    contactBranches: col("SELECT DISTINCT branch FROM contacts WHERE branch != '' ORDER BY branch"),
    saleBranches: col("SELECT DISTINCT branch FROM sales WHERE branch != '' ORDER BY branch"),
  };
}

export function getOverview(f: Filters) {
  const db = getDb();
  const mw = metaWhere(f, "adset");
  const meta = db.prepare(`
    SELECT COALESCE(SUM(spend),0) spend, COALESCE(SUM(reach),0) reach,
           COALESCE(SUM(impressions),0) impressions,
           COALESCE(SUM(CASE WHEN result_type LIKE 'Conversaciones%' THEN results ELSE 0 END),0) conversations
    FROM meta_rows WHERE ${mw.where}
  `).get(...mw.params) as Row;

  const cw = contactsWhere(f);
  const contacts = db.prepare(`
    SELECT COUNT(*) total, SUM(CASE WHEN phone != '' THEN 1 ELSE 0 END) withPhone
    FROM contacts WHERE ${cw.where}
  `).get(...cw.params) as Row;

  const sw = salesWhere(f);
  const sales = db.prepare(`
    SELECT COUNT(*) total, COALESCE(SUM(amount),0) revenue,
           SUM(CASE WHEN phone != '' THEN 1 ELSE 0 END) withPhone
    FROM sales WHERE ${sw.where}
  `).get(...sw.params) as Row;

  // Cruce por teléfono: contactos (conversaciones) que terminaron en compra
  const swm = salesWhere(f, "s.");
  const cwm = contactsWhere(f);
  const matched = db.prepare(`
    SELECT COUNT(DISTINCT s.phone) matchedPhones, COUNT(*) matchedSales,
           COALESCE(SUM(s.amount),0) matchedRevenue
    FROM sales s
    WHERE s.phone != '' AND ${swm.where}
      AND s.phone IN (SELECT phone FROM contacts WHERE phone != '' AND ${cwm.where})
  `).get(...swm.params, ...cwm.params) as Row;

  const spend = Number(meta.spend);
  const conversations = Number(meta.conversations);
  const withPhone = Number(contacts.withPhone) || 0;
  const matchedPhones = Number(matched.matchedPhones) || 0;
  const matchedRevenue = Number(matched.matchedRevenue) || 0;

  return {
    spend,
    reach: Number(meta.reach),
    impressions: Number(meta.impressions),
    conversations,
    contacts: Number(contacts.total),
    contactsWithPhone: withPhone,
    sales: Number(sales.total),
    revenue: Number(sales.revenue),
    matchedPhones,
    matchedSales: Number(matched.matchedSales) || 0,
    matchedRevenue,
    conversionRate: withPhone > 0 ? (matchedPhones / withPhone) * 100 : 0,
    costPerConversation: conversations > 0 ? spend / conversations : 0,
    costPerCustomer: matchedPhones > 0 ? spend / matchedPhones : 0,
    roas: spend > 0 ? matchedRevenue / spend : 0,
  };
}

export function getPauta(f: Filters) {
  const db = getDb();
  const mw = metaWhere(f, "adset");
  const byCampaign = db.prepare(`
    SELECT campaign, SUM(spend) spend, SUM(results) results, SUM(reach) reach, SUM(impressions) impressions,
           MAX(result_type) resultType,
           CASE WHEN SUM(results) > 0 THEN SUM(spend)/SUM(results) ELSE 0 END costPerResult
    FROM meta_rows WHERE ${mw.where} GROUP BY campaign ORDER BY spend DESC
  `).all(...mw.params);

  const byAdset = db.prepare(`
    SELECT campaign, adset, result_type resultType, SUM(spend) spend, SUM(results) results,
           SUM(reach) reach, SUM(impressions) impressions,
           CASE WHEN SUM(results) > 0 THEN SUM(spend)/SUM(results) ELSE 0 END costPerResult,
           MIN(start_date) startDate, MAX(end_date) endDate
    FROM meta_rows WHERE ${mw.where} GROUP BY campaign, adset ORDER BY spend DESC
  `).all(...mw.params);

  const mwd = metaWhere(f, "age_sex");
  const byAgeSex = db.prepare(`
    SELECT age, sex, SUM(results) results, SUM(spend) spend, SUM(impressions) impressions
    FROM meta_rows WHERE ${mwd.where} AND age != 'Unknown'
    GROUP BY age, sex ORDER BY age
  `).all(...mwd.params);

  const byAge = db.prepare(`
    SELECT age, SUM(results) results, SUM(spend) spend,
           CASE WHEN SUM(results) > 0 THEN SUM(spend)/SUM(results) ELSE 0 END costPerResult
    FROM meta_rows WHERE ${mwd.where} AND age != 'Unknown' GROUP BY age ORDER BY age
  `).all(...mwd.params);

  const bySex = db.prepare(`
    SELECT sex, SUM(results) results, SUM(spend) spend
    FROM meta_rows WHERE ${mwd.where} AND sex != 'unknown' GROUP BY sex
  `).all(...mwd.params);

  return { byCampaign, byAdset, byAgeSex, byAge, bySex };
}

export function getConversaciones(f: Filters) {
  const db = getDb();
  const cw = contactsWhere(f);

  const byDay = db.prepare(`
    SELECT substr(created_at, 1, 10) day, COUNT(*) contacts
    FROM contacts WHERE created_at != '' AND ${cw.where}
    GROUP BY day ORDER BY day
  `).all(...cw.params);

  const byHour = db.prepare(`
    SELECT CAST(substr(created_at, 12, 2) AS INTEGER) hour, COUNT(*) contacts
    FROM contacts WHERE created_at != '' AND ${cw.where}
    GROUP BY hour ORDER BY hour
  `).all(...cw.params);

  const byDow = db.prepare(`
    SELECT CAST(strftime('%w', substr(created_at,1,10)) AS INTEGER) dow, COUNT(*) contacts
    FROM contacts WHERE created_at != '' AND ${cw.where}
    GROUP BY dow ORDER BY dow
  `).all(...cw.params);

  const byBranch = db.prepare(`
    SELECT COALESCE(NULLIF(branch,''),'Sin asignar') branch, COUNT(*) contacts,
           SUM(CASE WHEN phone != '' THEN 1 ELSE 0 END) withPhone
    FROM contacts WHERE ${cw.where} GROUP BY 1 ORDER BY contacts DESC
  `).all(...cw.params);

  // heatmap día de semana x hora
  const heatmap = db.prepare(`
    SELECT CAST(strftime('%w', substr(created_at,1,10)) AS INTEGER) dow,
           CAST(substr(created_at, 12, 2) AS INTEGER) hour, COUNT(*) contacts
    FROM contacts WHERE created_at != '' AND ${cw.where}
    GROUP BY dow, hour
  `).all(...cw.params);

  const recent = db.prepare(`
    SELECT c.name, c.phone, c.branch, c.created_at,
           EXISTS(SELECT 1 FROM sales s WHERE s.phone = c.phone AND s.phone != '') bought
    FROM contacts c WHERE ${cw.where}
    ORDER BY c.created_at DESC LIMIT 50
  `).all(...cw.params);

  return { byDay, byHour, byDow, byBranch, heatmap, recent };
}

export function getVentas(f: Filters) {
  const db = getDb();
  const sw = salesWhere(f);

  const byBranch = db.prepare(`
    SELECT branch, COUNT(*) sales, SUM(amount) revenue, AVG(amount) avgTicket,
           SUM(CASE WHEN phone != '' THEN 1 ELSE 0 END) withPhone,
           SUM(CASE WHEN phone != '' AND phone IN (SELECT phone FROM contacts WHERE phone != '') THEN 1 ELSE 0 END) fromAds
    FROM sales WHERE ${sw.where} GROUP BY branch ORDER BY revenue DESC
  `).all(...sw.params);

  const byDay = db.prepare(`
    SELECT last_sale_date day, COUNT(*) sales, SUM(amount) revenue
    FROM sales WHERE last_sale_date != '' AND ${sw.where}
    GROUP BY day ORDER BY day
  `).all(...sw.params);

  const newVsOld = db.prepare(`
    SELECT CASE WHEN alta_date >= date('now', '-45 days') OR (alta_date != '' AND alta_date = last_sale_date) THEN 'Cliente nuevo' ELSE 'Cliente existente' END tipo,
           COUNT(*) sales, SUM(amount) revenue
    FROM sales WHERE ${sw.where} GROUP BY tipo
  `).all(...sw.params);

  const top = db.prepare(`
    SELECT client, branch, phone, last_sale_date, amount, invoices,
           EXISTS(SELECT 1 FROM contacts c WHERE c.phone = sales.phone AND sales.phone != '') fromAds
    FROM sales WHERE ${sw.where} ORDER BY amount DESC LIMIT 30
  `).all(...sw.params);

  return { byBranch, byDay, newVsOld, top };
}

export function getMatching(f: Filters) {
  const db = getDb();
  const cw = contactsWhere(f, "c.");
  const sw = salesWhere(f, "s.");

  const matches = db.prepare(`
    SELECT c.name contactName, c.phone, c.branch contactBranch, c.created_at contactedAt,
           s.client, s.branch saleBranch, s.last_sale_date saleDate, s.amount, s.invoices
    FROM contacts c
    JOIN sales s ON s.phone = c.phone AND s.phone != ''
    WHERE c.phone != '' AND ${cw.where} AND ${sw.where}
    ORDER BY s.amount DESC
  `).all(...cw.params, ...sw.params);

  const funnel = (() => {
    const o = getOverview(f);
    return [
      { stage: "Impresiones", value: o.impressions },
      { stage: "Alcance", value: o.reach },
      { stage: "Conversaciones iniciadas (Meta)", value: o.conversations },
      { stage: "Contactos con teléfono (CRM)", value: o.contactsWithPhone },
      { stage: "Compras cruzadas", value: o.matchedPhones },
    ];
  })();

  const byContactBranch = db.prepare(`
    SELECT COALESCE(NULLIF(c.branch,''),'Sin asignar') branch,
           COUNT(DISTINCT c.phone) contacts,
           COUNT(DISTINCT CASE WHEN s.phone IS NOT NULL THEN c.phone END) buyers,
           COALESCE(SUM(s.amount),0) revenue
    FROM contacts c
    LEFT JOIN sales s ON s.phone = c.phone AND s.phone != ''
    WHERE c.phone != '' AND ${cw.where}
    GROUP BY 1 ORDER BY contacts DESC
  `).all(...cw.params);

  const quality = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM contacts WHERE phone = '') contactsNoPhone,
      (SELECT COUNT(*) FROM sales WHERE phone = '') salesNoPhone,
      (SELECT COUNT(*) - COUNT(DISTINCT phone) FROM contacts WHERE phone != '') dupContactPhones,
      (SELECT COUNT(*) - COUNT(DISTINCT phone) FROM sales WHERE phone != '') dupSalePhones
  `).get() as Row;

  return { matches, funnel, byContactBranch, quality };
}

export function getImportLog() {
  const db = getDb();
  return db.prepare(`
    SELECT l.*, b.name blockName, f.name fileName, f.size fileSize
    FROM import_log l
    LEFT JOIN blocks b ON b.id = l.block_id
    LEFT JOIN uploaded_files f ON f.id = l.file_id
    ORDER BY l.id DESC LIMIT 50
  `).all();
}

// Archivos originales subidos, con las hojas que se importaron de cada uno.
export function getFiles() {
  const db = getDb();
  return db.prepare(`
    SELECT f.id, f.name, f.size, f.created_at, f.block_id blockId, b.name blockName,
           (SELECT COUNT(*) FROM import_log l WHERE l.file_id = f.id) sheets,
           (SELECT COALESCE(SUM(l.inserted), 0) FROM import_log l WHERE l.file_id = f.id) inserted
    FROM uploaded_files f LEFT JOIN blocks b ON b.id = f.block_id
    ORDER BY f.id DESC
  `).all();
}

// Bloques con el volumen de cada tabla, para la pantalla de Datos.
export function getBlocks() {
  const db = getDb();
  return db.prepare(`
    SELECT b.id, b.name, b.created_at,
           (SELECT COUNT(*) FROM meta_rows m WHERE m.block_id = b.id) metaRows,
           (SELECT COUNT(*) FROM contacts c WHERE c.block_id = b.id) contacts,
           (SELECT COUNT(*) FROM sales s WHERE s.block_id = b.id) sales
    FROM blocks b ORDER BY b.id DESC
  `).all();
}

export function renameBlock(id: number, name: string) {
  getDb().prepare("UPDATE blocks SET name = ? WHERE id = ?").run(name, id);
}

export function deleteBlock(id: number) {
  const db = getDb();
  const files = db
    .prepare("SELECT stored_name FROM uploaded_files WHERE block_id = ?")
    .all(id) as { stored_name: string }[];
  db.transaction(() => {
    for (const t of ["contacts", "sales", "meta_rows", "import_log", "uploaded_files"]) {
      db.prepare(`DELETE FROM ${t} WHERE block_id = ?`).run(id);
    }
    db.prepare("DELETE FROM blocks WHERE id = ?").run(id);
  })();
  // Los Excel guardados del bloque se van con él.
  for (const f of files) {
    try {
      fs.unlinkSync(path.join(uploadsDir(), f.stored_name));
    } catch {
      /* si ya no está, no hay nada que borrar */
    }
  }
}

// Resumen compacto de todos los datos: contexto para el chat / insights de IA
export function buildDigest(f: Filters = {}): string {
  const overview = getOverview(f);
  const pauta = getPauta(f);
  const conv = getConversaciones(f);
  const ventas = getVentas(f);
  const matching = getMatching(f);
  return JSON.stringify(
    {
      descripcion:
        "Datos de Grün Store (tienda de ropa, Corrientes/Misiones AR): pauta Meta Ads -> conversaciones WhatsApp (CRM Kommo) -> ventas por sucursal. Cruce por teléfono normalizado. Montos en ARS.",
      resumen: overview,
      pauta_por_campania: pauta.byCampaign,
      pauta_por_conjunto: pauta.byAdset,
      resultados_por_edad: pauta.byAge,
      resultados_por_sexo: pauta.bySex,
      conversaciones_por_hora: conv.byHour,
      conversaciones_por_dia_semana: conv.byDow,
      conversaciones_por_linea: conv.byBranch,
      ventas_por_sucursal: ventas.byBranch,
      conversion_por_linea_crm: matching.byContactBranch,
      calidad_datos: matching.quality,
      compras_cruzadas_top: matching.matches.slice(0, 15),
    },
    null,
    0
  );
}
