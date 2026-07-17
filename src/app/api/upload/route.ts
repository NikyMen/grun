import { NextRequest, NextResponse } from "next/server";
import { importWorkbook } from "@/lib/importers";
import { createBlock, saveUploadedFile } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll("file").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
    }
    // Todos los archivos de una misma subida entran al mismo bloque:
    // son una foto de datos que se lee y compara como una unidad.
    for (const file of files) {
      if (!/\.xlsx?$/i.test(file.name)) {
        return NextResponse.json(
          { error: `"${file.name}" no es un Excel (.xlsx). Si es .xls, guardalo como .xlsx desde Excel.` },
          { status: 400 }
        );
      }
    }
    const blockName = String(form.get("blockName") || "").trim();
    if (!blockName) {
      return NextResponse.json({ error: "Poné un nombre para el bloque" }, { status: 400 });
    }
    const blockId = createBlock(blockName);

    const all = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      // Se guarda el Excel original para poder verlo y descargarlo desde el historial.
      const fileId = saveUploadedFile(blockId, file.name, buffer);
      const results = await importWorkbook(buffer, file.name, blockId, fileId);
      all.push({ file: file.name, results });
    }
    return NextResponse.json({ ok: true, block: { id: blockId, name: blockName }, imports: all });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al procesar el archivo" },
      { status: 500 }
    );
  }
}
