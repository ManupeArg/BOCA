import { db } from "../lib/supabase.js";
import { json, error, body, usuario, handler, texto, esUuid } from "../lib/http.js";

const IMG = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

function validar(b) {
  const nombre = texto(b.nombre, 100);
  if (!nombre) return { err: "Falta el nombre del estadio" };
  const tipo = b.tipo === "neutral" ? "neutral" : "equipo";
  let escudo = null;
  if (tipo === "equipo" && b.escudo) {
    if (typeof b.escudo !== "string" || !IMG.test(b.escudo)) return { err: "La imagen del escudo no es válida" };
    if (b.escudo.length > 400_000) return { err: "La imagen del escudo es muy pesada" };
    escudo = b.escudo;
  }
  const pais = /^[A-Z]{2}$/.test(String(b.pais || "")) ? b.pais : "AR";
  return {
    fila: {
      nombre, tipo, equipo: tipo === "neutral" ? "" : texto(b.equipo, 80),
      ciudad: texto(b.ciudad, 80), pais, escudo, bombonera: !!b.bombonera,
    },
  };
}

export default handler(async (req, res) => {
  const uid = usuario(req, res); if (!uid) return;
  const id = req.query?.id;

  if (req.method === "POST" || req.method === "PUT") {
    const { fila, err } = validar(body(req));
    if (err) return error(res, 400, err);
    if (req.method === "POST") {
      const { error: e } = await db().from("canchas").insert({ ...fila, usuario_id: uid });
      if (e) throw e;
      return json(res, 201, { ok: true });
    }
    if (!esUuid(id)) return error(res, 400, "Falta la cancha");
    const { data, error: e } = await db().from("canchas").update(fila).eq("id", id).eq("usuario_id", uid).select("id");
    if (e) throw e;
    if (!data.length) return error(res, 404, "Esa cancha no existe");
    // mantener el nombre guardado en los partidos
    await db().from("partidos").update({ cancha_nombre: fila.nombre }).eq("cancha_id", id).eq("usuario_id", uid);
    return json(res, 200, { ok: true });
  }

  if (req.method === "DELETE") {
    if (!esUuid(id)) return error(res, 400, "Falta la cancha");
    const { count } = await db().from("partidos").select("id", { count: "exact", head: true }).eq("cancha_id", id).eq("usuario_id", uid);
    if (count) return error(res, 409, `Tiene ${count} ${count === 1 ? "partido" : "partidos"} cargados. Cambiales la cancha primero.`);
    const { error: e } = await db().from("canchas").delete().eq("id", id).eq("usuario_id", uid);
    if (e) throw e;
    return json(res, 200, { ok: true });
  }

  error(res, 405, "Método no permitido");
});
