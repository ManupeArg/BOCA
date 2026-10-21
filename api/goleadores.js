import { db } from "../lib/supabase.js";
import { json, error, body, usuario, handler, texto, entero, clave, esUuid } from "../lib/http.js";

export default handler(async (req, res) => {
  const uid = usuario(req, res); if (!uid) return;

  // Suma goles a mano a un jugador (si ya existe, se acumulan)
  if (req.method === "POST") {
    const b = body(req);
    const nombre = texto(b.nombre, 60);
    const goles = entero(b.goles, 1, 500);
    if (!nombre) return error(res, 400, "Falta el nombre del jugador");
    const equipo = b.equipo === "argentina" ? "argentina" : "boca";
    const k = clave(nombre);
    const { data: prev } = await db().from("goleadores_manual").select("id,goles")
      .eq("usuario_id", uid).eq("equipo", equipo).eq("clave", k).maybeSingle();
    const r = prev
      ? await db().from("goleadores_manual").update({ goles: prev.goles + goles }).eq("id", prev.id)
      : await db().from("goleadores_manual").insert({ usuario_id: uid, equipo, nombre, clave: k, goles });
    if (r.error) throw r.error;
    return json(res, 200, { ok: true });
  }

  if (req.method === "DELETE") {
    const id = req.query?.id;
    if (!esUuid(id)) return error(res, 400, "Falta el goleador");
    const { error: e } = await db().from("goleadores_manual").delete().eq("id", id).eq("usuario_id", uid);
    if (e) throw e;
    return json(res, 200, { ok: true });
  }

  error(res, 405, "Método no permitido");
});
