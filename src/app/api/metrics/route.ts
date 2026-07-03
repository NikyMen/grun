import { NextRequest, NextResponse } from "next/server";
import {
  Filters,
  getFilterOptions,
  getOverview,
  getPauta,
  getConversaciones,
  getVentas,
  getMatching,
  getImportLog,
} from "@/lib/metrics";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const section = sp.get("section") || "overview";
  const f: Filters = {
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
    campaign: sp.get("campaign") || undefined,
    adset: sp.get("adset") || undefined,
    age: sp.get("age") || undefined,
    sex: sp.get("sex") || undefined,
    resultType: sp.get("resultType") || undefined,
    branch: sp.get("branch") || undefined,
  };

  try {
    switch (section) {
      case "filters":
        return NextResponse.json(getFilterOptions());
      case "overview":
        return NextResponse.json(getOverview(f));
      case "pauta":
        return NextResponse.json(getPauta(f));
      case "conversaciones":
        return NextResponse.json(getConversaciones(f));
      case "ventas":
        return NextResponse.json(getVentas(f));
      case "matching":
        return NextResponse.json(getMatching(f));
      case "importlog":
        return NextResponse.json(getImportLog());
      default:
        return NextResponse.json({ error: "Sección desconocida" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error interno" },
      { status: 500 }
    );
  }
}
