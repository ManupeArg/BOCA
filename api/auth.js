import { db } from "../lib/supabase.js";
import { crearCookie, borrarCookie, leerSesion } from "../lib/session.js";
import { json, error, body, handler } from "../lib/http.js";

const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function invitado(email) {
  const lista = (process.env.ALLOWED_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return lista.length === 0 || lista.includes(email);
}

export default handler(async (req, res) => {
  // ¿Quién soy?
  if (req.method === "GET") {
    const id = leerSesion(req);
    if (!id) return error(res, 401, "Sin sesión");
    const { data } = await db().from("usuarios").select("email").eq("id", id).maybeSingle();
    if (!data) return error(res, 401, "Sin sesión");
    return json(res, 200, { email: data.email });
  }

  // Salir
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", borrarCookie());
    return json(res, 200, { ok: true });
  }

  if (req.method !== "POST") return error(res, 405, "Método no permitido");

  const { email: raw, modo } = body(req);
  const email = String(raw || "").trim().toLowerCase();
  if (!MAIL.test(email) || email.length > 200) return error(res, 400, "Ese mail no parece válido");

  const { data: existe } = await db().from("usuarios").select("id").eq("email", email).maybeSingle();

  if (modo === "registrar") {
    if (existe) return error(res, 409, "Ese mail ya está registrado. Tocá Entrar.");
    if (!invitado(email)) return error(res, 403, "Ese mail no está invitado. Pedile acceso a Manuel.");
    const { data: nuevo, error: e } = await db().from("usuarios").insert({ email }).select("id").single();
    if (e) throw e;
    // Todos arrancan con La Bombonera cargada
    await db().from("canchas").insert({
      usuario_id: nuevo.id, nombre: "La Bombonera", tipo: "equipo", equipo: "Boca Juniors",
      ciudad: "Buenos Aires", pais: "AR", bombonera: true,
    });
    res.setHeader("Set-Cookie", crearCookie(nuevo.id));
    return json(res, 201, { email });
  }

  // Entrar
  if (!existe) return error(res, 404, "No encontramos ese mail. Registrate primero.");
  res.setHeader("Set-Cookie", crearCookie(existe.id));
  return json(res, 200, { email });
});
