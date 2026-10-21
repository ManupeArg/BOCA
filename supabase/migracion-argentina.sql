-- Migración: pestaña ARGENTINA
-- Corré esto UNA vez en Supabase → SQL Editor → Run (no borra nada).

alter table partidos
  add column if not exists equipo text not null default 'boca';
alter table partidos drop constraint if exists partidos_equipo_check;
alter table partidos add constraint partidos_equipo_check check (equipo in ('boca','argentina'));

alter table goleadores_manual
  add column if not exists equipo text not null default 'boca';
alter table goleadores_manual drop constraint if exists goleadores_manual_equipo_check;
alter table goleadores_manual add constraint goleadores_manual_equipo_check check (equipo in ('boca','argentina'));

-- el mismo jugador puede tener goles a mano para Boca y para Argentina por separado
alter table goleadores_manual drop constraint if exists goleadores_manual_usuario_id_clave_key;
alter table goleadores_manual drop constraint if exists goleadores_manual_unico;
alter table goleadores_manual add constraint goleadores_manual_unico unique (usuario_id, equipo, clave);
