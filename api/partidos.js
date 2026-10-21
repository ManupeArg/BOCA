import { db } from "../lib/supabase.js";
import { json, error, body, usuario, handler, texto, entero, esUuid } from "../lib/http.js";

async function validar(uid, b) {
  const fecha = String(b.fecha || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { err: "Poné una fecha válida" };
  const rival = texto(b.rival, 80);
  if (!rival) return { err: "Falta el rival" };
  const gf = entero(b.gf), gc = entero(b.gc);
  const goleadores = (Array.isArray(b.goleadores) ? b.goleadores : [])
    .slice(0, 30)
    .map((g) => ({ nombre: texto(g?.nombre, 60), goles: entero(g?.goles, 1, 20) }))
    .filter((g) => g.nombre);
  if (goleadores.reduce((a, g) => a + g.goles, 0) > gf) return { err: "Hay más goles de jugadores que goles del equipo" };
  const equipo = b.equipo === "argentina" ? "argentina" : "boca";
  if (!esUuid(b.canchaId)) return { err: "Elegí una cancha" };
  const { data: cancha } = await db().from("canchas").select("id,nombre").eq("id", b.canchaId).eq("usuario_id", uid).maybeSingle();
  if (!cancha) return { err: "Esa cancha no existe" };
  return {
    fila: {
      equipo, fecha, torneo: texto(b.torneo, 80), rival, gf, gc, goleadores,
      cancha_id: cancha.id, cancha_nombre: cancha.nombre, sector: texto(b.sector, 60),
    },
  };
}

export default handler(async (req, res) => {
  const uid = usuario(req, res); if (!uid) return;
  const id = req.query?.id;

  if (req.method === "POST" || req.method === "PUT") {
    const { fila, err } = await validar(uid, body(req));
    if (err) return error(res, 400, err);
    if (req.method === "POST") {
      const { error: e } = await db().from("partidos").insert({ ...fila, usuario_id: uid });
      if (e) throw e;
      return json(res, 201, { ok: true });
    }
    if (!esUuid(id)) return error(res, 400, "Falta el partido");
    const { data, error: e } = await db().from("partidos").update(fila).eq("id", id).eq("usuario_id", uid).select("id");
    if (e) throw e;
    if (!data.length) return error(res, 404, "Ese partido no existe");
    return json(res, 200, { ok: true });
  }

  if (req.method === "DELETE") {
    if (!esUuid(id)) return error(res, 400, "Falta el partido");
    const { error: e } = await db().from("partidos").delete().eq("id", id).eq("usuario_id", uid);
    if (e) throw e;
    return json(res, 200, { ok: true });
  }

  error(res, 405, "Método no permitido");
});
