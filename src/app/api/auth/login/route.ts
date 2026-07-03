import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { createToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "Ingresá email y contraseña" }, { status: 400 });
  }
  const db = getDb();
  const user = db
    .prepare("SELECT id, email, password_hash, name FROM users WHERE email = ?")
    .get(String(email).trim().toLowerCase()) as
    | { id: number; email: string; password_hash: string; name: string }
    | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: "Email o contraseña incorrectos" }, { status: 401 });
  }

  const token = await createToken({ sub: String(user.id), email: user.email, name: user.name });
  const res = NextResponse.json({ ok: true, name: user.name });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
