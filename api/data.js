import { db } from "../lib/supabase.js";
import { json, error, usuario, handler } from "../lib/http.js";

export const mapCancha = (c) => ({
  id: c.id, nombre: c.nombre, tipo: c.tipo, equipo: c.equipo, ciudad: c.ciudad,
  pais: c.pais, escudo: c.escudo, bombonera: c.bombonera,
});
export const mapPartido = (p) => ({
  id: p.id, fecha: p.fecha, torneo: p.torneo, rival: p.rival, gf: p.gf, gc: p.gc,
  goleadores: p.goleadores || [], canchaId: p.cancha_id, canchaNombre: p.cancha_nombre,
  sector: p.sector, equipo: p.equipo || "boca", creado: new Date(p.creado).getTime(),
});

export default handler(async (req, res) => {
  if (req.method !== "GET") return error(res, 405, "Método no permitido");
  const uid = usuario(req, res); if (!uid) return;
  const [p, c, g] = await Promise.all([
    db().from("partidos").select("*").eq("usuario_id", uid).order("fecha", { ascending: false }),
    db().from("canchas").select("*").eq("usuario_id", uid),
    db().from("goleadores_manual").select("id,nombre,goles,equipo").eq("usuario_id", uid),
  ]);
  for (const r of [p, c, g]) if (r.error) throw r.error;
  json(res, 200, {
    partidos: p.data.map(mapPartido),
    canchas: c.data.map(mapCancha),
    goleadores: g.data,
  });
});
