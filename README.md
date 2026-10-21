# Mis Partidos de Boca

Web para registrar los partidos de Boca que viste en la cancha. Cada persona entra con su mail y ve solo sus propios partidos, canchas y goleadores.

- **Frontend:** HTML + CSS + JS sin framework, en `public/`
- **API:** funciones serverless de Vercel, en `api/`
- **Base de datos:** Supabase (Postgres)

```
api/        auth.js (login/registro/salir), data.js, partidos.js, canchas.js, goleadores.js
lib/        conexión a Supabase, sesión con cookie firmada, helpers
public/     index.html, app.js, styles.css, icon.svg, manifest
supabase/   schema.sql
```

## 1. Base de datos (Supabase)

1. Creá un proyecto nuevo en https://supabase.com
2. Andá a **SQL Editor**, pegá el contenido de `supabase/schema.sql` y tocá **Run**.
3. En **Project Settings → API** copiá la **Project URL** y la **service_role key**.

## 2. El escudo

Poné la imagen del escudo de Boca en `public/escudo.png` (PNG cuadrado, idealmente 512×512 con fondo transparente).
Se usa como logo, en la pantalla de login y como ícono cuando la agregás a la pantalla de inicio del celular.
Si no está, la app muestra una pelota.

## 3. Subirla a Vercel

1. Subí esta carpeta a un repo de GitHub.
2. En Vercel: **Add New → Project**, importá el repo. Framework: **Other**. No hace falta tocar nada más.
3. En **Settings → Environment Variables** cargá:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | la Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | la service_role key |
| `SESSION_SECRET` | un texto largo al azar (`openssl rand -hex 32`) |
| `ALLOWED_EMAILS` | opcional: mails que pueden registrarse, separados por coma |

4. Deploy. Pasale el link a tus amigos.

## 4. En el celular

Abrí el link en Safari (iPhone) o Chrome (Android) → **Compartir → Agregar a inicio**. Queda como una app con el escudo.

## Probar en la compu

```bash
npm install
cp .env.example .env   # y completá los valores
npx vercel dev
```

## Cómo funciona el login

- **Registrarme:** pone su mail y se crea la cuenta (con La Bombonera ya cargada como cancha).
- **Entrar:** pone su mail y entra. La sesión dura un año en ese celular.
- No hay contraseña ni mail de verificación: cualquiera que sepa el mail de otro puede entrar a su cuenta.
  Para un grupo de amigos alcanza; si querés cerrarlo más, completá `ALLOWED_EMAILS` para que solo esos mails se puedan registrar.
