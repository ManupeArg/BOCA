import { leerSesion } from "./session.js";

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export const error = (res, status, mensaje) => json(res, status, { error: mensaje });

export function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

/** Devuelve el id del usuario logueado o responde 401. */
export function usuario(req, res) {
  const id = leerSesion(req);
  if (!id) { error(res, 401, "Tenés que entrar con tu mail"); return null; }
  return id;
}

/** Envuelve un handler para que cualquier error responda 500 con un mensaje claro. */
export function handler(fn) {
  return async (req, res) => {
    try { await fn(req, res); }
    catch (e) { console.error(e); error(res, 500, "Algo falló en el servidor. Probá de nuevo."); }
  };
}

export const texto = (v, max = 120) => String(v ?? "").trim().slice(0, max);
export const entero = (v, min = 0, max = 99) => Math.min(max, Math.max(min, parseInt(v, 10) || 0));
export const clave = (n) =>
  String(n || "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
export const esUuid = (v) => /^[0-9a-f-]{36}$/i.test(String(v || ""));
