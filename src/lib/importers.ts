import ExcelJS from "exceljs";
import crypto from "crypto";
import { getDb } from "./db";
import { normPhone } from "./phone";

export type ImportResult = {
  sheet: string;
  kind: "meta" | "contactos" | "ventas" | "desconocida";
  inserted: number;
  duplicates: number;
};

// ---------- helpers ----------

function strip(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function cellStr(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return isoDateTime(v);
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if ("richText" in o)
      return (o.richText as { text: string }[]).map((r) => r.text).join("");
    if ("text" in o) return String(o.text);
    if ("result" in o) return cellStr(o.result as ExcelJS.CellValue);
    return "";
  }
  return String(v).trim();
}

function cellNum(v: ExcelJS.CellValue): number {
  if (typeof v === "number") return v;
  const s = cellStr(v).replace(/[^\d.,-]/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function isoDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// "15.06.2026 19:55:07" | Date | "2026-06-15" -> "YYYY-MM-DD HH:MM:SS"
function parseDateTime(v: ExcelJS.CellValue): string {
  if (v instanceof Date) return isoDateTime(v);
  const s = cellStr(v);
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})(?: (\d{2}):(\d{2}):(\d{2}))?/);
  if (m) return `${m[3]}-${m[2]}-${m[1]} ${m[4] || "00"}:${m[5] || "00"}:${m[6] || "00"}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]} 00:00:00`;
  return "";
}

function parseDate(v: ExcelJS.CellValue): string {
  const dt = parseDateTime(v);
  return dt ? dt.slice(0, 10) : "";
}

function md5(s: string): string {
  return crypto.createHash("md5").update(s).digest("hex");
}

function headerMap(ws: ExcelJS.Worksheet): Map<string, number> {
  const map = new Map<string, number>();
  ws.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
    const key = strip(cellStr(cell.value));
    if (key && !map.has(key)) map.set(key, col);
  });
  return map;
}

function findCol(map: Map<string, number>, ...candidates: string[]): number {
  for (const c of candidates) {
    const key = strip(c);
    if (map.has(key)) return map.get(key)!;
  }
  for (const c of candidates) {
    const key = strip(c);
    for (const [h, col] of map) if (h.startsWith(key)) return col;
  }
  return -1;
}

type SheetKind = ImportResult["kind"];

function detectKind(map: Map<string, number>): SheetKind {
  if (findCol(map, "nombre de la campana", "nombre de la campaña") > 0) return "meta";
  if (findCol(map, "nombre_suc") > 0) return "ventas";
  if (findCol(map, "telefono") > 0 && (findCol(map, "leads") > 0 || findCol(map, "fecha de creacion") > 0))
    return "contactos";
  return "desconocida";
}

// ---------- importadores por tipo ----------

function importContacts(ws: ExcelJS.Worksheet, sourceFile: string): ImportResult {
  const db = getDb();
  const map = headerMap(ws);
  const cId = findCol(map, "id");
  const cName = findCol(map, "nombre");
  const cCreated = findCol(map, "fecha de creacion");
  const cTags = findCol(map, "etiquetas");
  const cBranch = findCol(map, "usuario responsable");
  const cLead = findCol(map, "leads");
  const cPhone = findCol(map, "telefono");
  const cPhoneOffice = findCol(map, "telefono oficina");
  const cPhoneCell = findCol(map, "telefono celular");

  const ins = db.prepare(`
    INSERT OR IGNORE INTO contacts (crm_id, name, phone, phone_raw, branch, lead_ref, tags, created_at, source_file)
    VALUES (@crm_id, @name, @phone, @phone_raw, @branch, @lead_ref, @tags, @created_at, @source_file)
  `);

  let inserted = 0;
  let duplicates = 0;
  const run = db.transaction(() => {
    ws.eachRow((row, n) => {
      if (n === 1) return;
      const crmId = cId > 0 ? cellStr(row.getCell(cId).value) : "";
      const name = cName > 0 ? cellStr(row.getCell(cName).value) : "";
      if (!crmId && !name) return;
      const rawPhone =
        (cPhone > 0 && cellStr(row.getCell(cPhone).value)) ||
        (cPhoneOffice > 0 && cellStr(row.getCell(cPhoneOffice).value)) ||
        (cPhoneCell > 0 && cellStr(row.getCell(cPhoneCell).value)) ||
        "";
      const created = cCreated > 0 ? parseDateTime(row.getCell(cCreated).value) : "";
      const rec = {
        crm_id: crmId || md5(`${name}|${rawPhone}|${created}`),
        name,
        phone: normPhone(rawPhone),
        phone_raw: rawPhone,
        branch: cBranch > 0 ? cellStr(row.getCell(cBranch).value) : "",
        lead_ref: cLead > 0 ? cellStr(row.getCell(cLead).value) : "",
        tags: cTags > 0 ? cellStr(row.getCell(cTags).value) : "",
        created_at: created,
        source_file: sourceFile,
      };
      const r = ins.run(rec);
      if (r.changes > 0) inserted++;
      else duplicates++;
    });
  });
  run();
  return { sheet: ws.name, kind: "contactos", inserted, duplicates };
}

function importSales(ws: ExcelJS.Worksheet, sourceFile: string): ImportResult {
  const db = getDb();
  const map = headerMap(ws);
  const cBranch = findCol(map, "nombre_suc");
  const cClient = findCol(map, "cliente");
  const cAlta = findCol(map, "fecha_alta");
  const cBirth = findCol(map, "cumpleanio", "cumpleaños");
  const cPhone = findCol(map, "telefono_1");
  const cLast = findCol(map, "fechaultimaventa");
  const cAmount = findCol(map, "importe neto descuentos", "importe");
  const cInvoices = findCol(map, "total facturas");

  const ins = db.prepare(`
    INSERT OR IGNORE INTO sales (uniq_hash, branch, client, phone, phone_raw, alta_date, birthday, last_sale_date, amount, invoices, source_file)
    VALUES (@uniq_hash, @branch, @client, @phone, @phone_raw, @alta_date, @birthday, @last_sale_date, @amount, @invoices, @source_file)
  `);

  let inserted = 0;
  let duplicates = 0;
  const run = db.transaction(() => {
    ws.eachRow((row, n) => {
      if (n === 1) return;
      const branch = cBranch > 0 ? cellStr(row.getCell(cBranch).value) : "";
      const client = cClient > 0 ? cellStr(row.getCell(cClient).value) : "";
      if (!branch && !client) return;
      const rawPhone = cPhone > 0 ? cellStr(row.getCell(cPhone).value) : "";
      const lastSale = cLast > 0 ? parseDate(row.getCell(cLast).value) : "";
      const amount = cAmount > 0 ? cellNum(row.getCell(cAmount).value) : 0;
      const rec = {
        uniq_hash: md5(`${branch}|${client}|${rawPhone}|${lastSale}|${amount}`),
        branch,
        client,
        phone: normPhone(rawPhone),
        phone_raw: rawPhone,
        alta_date: cAlta > 0 ? parseDate(row.getCell(cAlta).value) : "",
        birthday: cBirth > 0 ? parseDate(row.getCell(cBirth).value) : "",
        last_sale_date: lastSale,
        amount,
        invoices: cInvoices > 0 ? cellNum(row.getCell(cInvoices).value) : 0,
        source_file: sourceFile,
      };
      const r = ins.run(rec);
      if (r.changes > 0) inserted++;
      else duplicates++;
    });
  });
  run();
  return { sheet: ws.name, kind: "ventas", inserted, duplicates };
}

function importMeta(ws: ExcelJS.Worksheet, sourceFile: string): ImportResult {
  const db = getDb();
  const map = headerMap(ws);
  const cCamp = findCol(map, "nombre de la campana", "nombre de la campaña");
  const cAdset = findCol(map, "nombre del conjunto de anuncios", "nombre del conjunto");
  const cAge = findCol(map, "edad");
  const cSex = findCol(map, "sexo");
  const cReach = findCol(map, "alcance");
  const cImp = findCol(map, "impresiones");
  const cRType = findCol(map, "tipo de resultado");
  const cResults = findCol(map, "resultados");
  const cSpend = findCol(map, "importe gastado (ars)", "importe gastado");
  const cCpr = findCol(map, "costo por resultado");
  const cStart = findCol(map, "inicio");
  const cEnd = findCol(map, "finalizacion", "finalización");

  const ins = db.prepare(`
    INSERT OR IGNORE INTO meta_rows (uniq_hash, campaign, adset, age, sex, reach, impressions, result_type, results, spend, cost_per_result, start_date, end_date, level, source_file)
    VALUES (@uniq_hash, @campaign, @adset, @age, @sex, @reach, @impressions, @result_type, @results, @spend, @cost_per_result, @start_date, @end_date, @level, @source_file)
  `);

  let inserted = 0;
  let duplicates = 0;
  const run = db.transaction(() => {
    ws.eachRow((row, n) => {
      if (n === 1) return;
      const campaign = cCamp > 0 ? cellStr(row.getCell(cCamp).value) : "";
      if (!campaign) return;
      const adset = cAdset > 0 ? cellStr(row.getCell(cAdset).value) : "";
      const age = cAge > 0 ? cellStr(row.getCell(cAge).value) : "";
      const sex = cSex > 0 ? cellStr(row.getCell(cSex).value) : "";
      // Meta exporta filas agregadas ("All") junto a los desgloses: se etiqueta
      // el nivel para no sumar dos veces al calcular métricas.
      const level =
        adset === "All" || adset === ""
          ? "campaign"
          : age === "All" && sex === "All"
            ? "adset"
            : sex === "All"
              ? "age"
              : "age_sex";
      const rec = {
        campaign,
        adset,
        age,
        sex,
        reach: cReach > 0 ? cellNum(row.getCell(cReach).value) : 0,
        impressions: cImp > 0 ? cellNum(row.getCell(cImp).value) : 0,
        result_type: (cRType > 0 ? cellStr(row.getCell(cRType).value) : "") || "Sin resultado",
        results: cResults > 0 ? cellNum(row.getCell(cResults).value) : 0,
        spend: cSpend > 0 ? cellNum(row.getCell(cSpend).value) : 0,
        cost_per_result: cCpr > 0 ? cellNum(row.getCell(cCpr).value) : 0,
        start_date: cStart > 0 ? parseDate(row.getCell(cStart).value) : "",
        end_date: cEnd > 0 ? cellStr(row.getCell(cEnd).value) : "",
        level,
        source_file: sourceFile,
        uniq_hash: "",
      };
      rec.uniq_hash = md5(
        [rec.campaign, rec.adset, rec.age, rec.sex, rec.reach, rec.impressions, rec.result_type, rec.results, rec.spend, rec.start_date, rec.end_date].join("|")
      );
      const r = ins.run(rec);
      if (r.changes > 0) inserted++;
      else duplicates++;
    });
  });
  run();
  return { sheet: ws.name, kind: "meta", inserted, duplicates };
}

// ---------- punto de entrada ----------

export async function importWorkbook(buffer: Buffer, fileName: string): Promise<ImportResult[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const db = getDb();
  const results: ImportResult[] = [];

  for (const ws of wb.worksheets) {
    if (ws.rowCount < 2) continue;
    const kind = detectKind(headerMap(ws));
    let res: ImportResult;
    if (kind === "contactos") res = importContacts(ws, fileName);
    else if (kind === "ventas") res = importSales(ws, fileName);
    else if (kind === "meta") res = importMeta(ws, fileName);
    else continue; // hojas pivot u otras se ignoran
    db.prepare(
      "INSERT INTO import_log (file, sheet, kind, inserted, duplicates) VALUES (?, ?, ?, ?, ?)"
    ).run(fileName, res.sheet, res.kind, res.inserted, res.duplicates);
    results.push(res);
  }
  return results;
}
