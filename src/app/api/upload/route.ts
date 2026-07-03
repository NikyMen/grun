import { NextRequest, NextResponse } from "next/server";
import { importWorkbook } from "@/lib/importers";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll("file").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
    }
    const all = [];
    for (const file of files) {
      if (!/\.xlsx?$/i.test(file.name)) {
        return NextResponse.json(
          { error: `"${file.name}" no es un Excel (.xlsx). Si es .xls, guardalo como .xlsx desde Excel.` },
          { status: 400 }
        );
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const results = await importWorkbook(buffer, file.name);
      all.push({ file: file.name, results });
    }
    return NextResponse.json({ ok: true, imports: all });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al procesar el archivo" },
      { status: 500 }
    );
  }
}
