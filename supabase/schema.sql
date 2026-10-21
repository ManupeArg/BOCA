-- Mis Partidos de Boca — pegá esto en Supabase → SQL Editor → Run

create extension if not exists pgcrypto;

create table if not exists usuarios (
  id      uuid primary key default gen_random_uuid(),
  email   text not null unique,
  creado  timestamptz not null default now()
);

create table if not exists canchas (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references usuarios(id) on delete cascade,
  nombre      text not null,
  tipo        text not null default 'equipo' check (tipo in ('equipo','neutral')),
  equipo      text not null default '',
  ciudad      text not null default '',
  pais        text not null default 'AR',
  escudo      text,               -- imagen chica en data URL (png/jpg/webp)
  bombonera   boolean not null default false,
  creado      timestamptz not null default now()
);
create index if not exists canchas_usuario_idx on canchas(usuario_id);

create table if not exists partidos (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null references usuarios(id) on delete cascade,
  fecha          date not null,
  torneo         text not null default '',
  rival          text not null,
  gf             int  not null default 0 check (gf >= 0),
  gc             int  not null default 0 check (gc >= 0),
  goleadores     jsonb not null default '[]'::jsonb,  -- [{ "nombre": "...", "goles": 1 }]
  cancha_id      uuid references canchas(id) on delete set null,
  cancha_nombre  text not null default '',
  sector         text not null default '',
  creado         timestamptz not null default now()
);
create index if not exists partidos_usuario_idx on partidos(usuario_id, fecha desc);

create table if not exists goleadores_manual (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references usuarios(id) on delete cascade,
  nombre      text not null,
  clave       text not null,      -- nombre normalizado para no duplicar
  goles       int  not null check (goles > 0),
  unique (usuario_id, clave)
);

-- Seguridad: RLS activado y sin políticas = nadie entra con la clave pública.
-- Solo la API (con la service role key) lee y escribe.
alter table usuarios          enable row level security;
alter table canchas           enable row level security;
alter table partidos          enable row level security;
alter table goleadores_manual enable row level security;
