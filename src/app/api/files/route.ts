import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { getUploadedFile, uploadsDir } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_PREVIEW_ROWS = 100;
const MAX_PREVIEW_COLS = 25;

// GET /api/files?id=1            -> descarga el Excel original
// GET /api/files?id=1&mode=view  -> primeras filas de cada hoja, para ver en pantalla
export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });

  const record = getUploadedFile(id);
  if (!record) return NextResponse.json({ error: "El archivo no existe" }, { status: 404 });

  // stored_name lo generó la app al subir; aun así se resuelve contra la carpeta
  // de uploads y se verifica, para que nada apunte fuera de ella.
  const dir = uploadsDir();
  const full = path.resolve(dir, record.stored_name);
  if (path.dirname(full) !== path.resolve(dir) || !fs.existsSync(full)) {
    return NextResponse.json(
      { error: "El archivo original ya no está guardado en el servidor" },
      { status: 404 }
    );
  }

  if (req.nextUrl.searchParams.get("mode") === "view") {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(full);
    const sheets = wb.worksheets.map((ws) => {
      const rows: string[][] = [];
      ws.eachRow({ includeEmpty: false }, (row, n) => {
        if (n > MAX_PREVIEW_ROWS) return;
        const cells: string[] = [];
        for (let c = 1; c <= Math.min(ws.columnCount, MAX_PREVIEW_COLS); c++) {
          cells.push(cellText(row.getCell(c).value));
        }
        rows.push(cells);
      });
      return {
        name: ws.name,
        totalRows: ws.rowCount,
        truncated: ws.rowCount > MAX_PREVIEW_ROWS || ws.columnCount > MAX_PREVIEW_COLS,
        rows,
      };
    });
    return NextResponse.json({ name: record.name, size: record.size, sheets });
  }

  const buffer = fs.readFileSync(full);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(record.name)}`,
    },
  });
}

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 19).replace("T", " ");
  if (typeof v === "object") {
    const o = v as unknown as Record<string, unknown>;
    if ("richText" in o) return (o.richText as { text: string }[]).map((r) => r.text).join("");
    if ("text" in o) return String(o.text);
    if ("result" in o) return cellText(o.result as ExcelJS.CellValue);
    if ("hyperlink" in o) return String(o.hyperlink);
    return "";
  }
  return String(v);
}
