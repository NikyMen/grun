import { SignJWT, jwtVerify } from "jose";

const secret = () =>
  new TextEncoder().encode(process.env.AUTH_SECRET || "grun-dev-secret");

export const COOKIE_NAME = "grun_token";

export async function createToken(payload: { sub: string; email: string; name: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as { sub: string; email: string; name: string };
  } catch {
    return null;
  }
}
