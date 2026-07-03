import { NextRequest, NextResponse } from "next/server";
import { generateInsight, rateInsight } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const section = typeof body.section === "string" ? body.section : "overview";
  const filters = (body.filters && typeof body.filters === "object" ? body.filters : {}) as Record<string, string>;
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(filters)) if (v) clean[k] = String(v);
  const insight = await generateInsight(section, clean);
  return NextResponse.json(insight);
}

export async function PATCH(req: NextRequest) {
  const { id, rating } = await req.json().catch(() => ({}));
  if (!id || ![1, -1].includes(rating)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }
  rateInsight(Number(id), rating);
  return NextResponse.json({ ok: true });
}
