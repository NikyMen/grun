import { NextRequest, NextResponse } from "next/server";
import { deleteBlock, renameBlock } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const { id, name } = await req.json().catch(() => ({}));
  if (!id || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  }
  renameBlock(Number(id), name.trim());
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Falta el bloque" }, { status: 400 });
  deleteBlock(id);
  return NextResponse.json({ ok: true });
}
