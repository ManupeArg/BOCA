import crypto from "node:crypto";

const COOKIE = "boca_sid";
const UN_ANIO = 60 * 60 * 24 * 365;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET falta o es muy corto");
  return s;
}
const b64 = (s) => Buffer.from(s).toString("base64url");
const firmar = (data) => crypto.createHmac("sha256", secret()).update(data).digest("base64url");

export function crearCookie(userId) {
  const payload = b64(JSON.stringify({ u: userId, exp: Date.now() + UN_ANIO * 1000 }));
  const token = `${payload}.${firmar(payload)}`;
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${UN_ANIO}`;
}

export function borrarCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function leerSesion(req) {
  const raw = req.headers.cookie || "";
  const m = raw.split(/;\s*/).find((c) => c.startsWith(COOKIE + "="));
  if (!m) return null;
  const [payload, firma] = m.slice(COOKIE.length + 1).split(".");
  if (!payload || !firma) return null;
  const esperada = firmar(payload);
  const a = Buffer.from(firma), b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!data.u || data.exp < Date.now()) return null;
    return data.u;
  } catch {
    return null;
  }
}
