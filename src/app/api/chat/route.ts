import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { chat } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  const db = getDb();
  const messages = db
    .prepare("SELECT id, role, content, created_at FROM chat_messages ORDER BY id ASC LIMIT 200")
    .all();
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const { message } = await req.json().catch(() => ({}));
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  }
  const reply = await chat(message.slice(0, 4000));
  return NextResponse.json({ reply });
}

export async function DELETE() {
  getDb().prepare("DELETE FROM chat_messages").run();
  return NextResponse.json({ ok: true });
}
