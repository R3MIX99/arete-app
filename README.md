# Aretia

Aplicación para gimnasios (web y móvil, iOS/Android). Los entrenadores crean y
asignan rutinas de entrenamiento y planes de nutrición a sus clientes, con
apoyo de inteligencia artificial. Tres roles: superadministrador, entrenador
y cliente.

Consulta [`CLAUDE.md`](CLAUDE.md) para las reglas de desarrollo del proyecto.

## Estructura del repositorio

```
web/         App Next.js (App Router) — el producto en sí, empaquetado con
             Capacitor para Android/iOS como wrapper delgado
web/supabase/  Migraciones, políticas RLS y Edge Functions
docs/        Documentación del proyecto
```

## Stack técnico

- **App:** Next.js (App Router, TypeScript, Tailwind v4, shadcn/ui).
  Empaquetada con Capacitor: la app móvil carga la web real por
  `server.url` en vez de llevar el build de Next.js adentro, así un
  deploy nuevo se refleja solo, sin recompilar ni resubir nada a las
  tiendas.
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions, Realtime,
  pgvector).
- **IA:** API de Claude, invocada únicamente desde Edge Functions.
- **Pagos:** Stripe, gestionado fuera de la app (sitio web externo).

## Cómo levantar la app en local

```bash
cd web
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) en el navegador.

Antes de dar cualquier cambio por terminado, corré el chequeo de tipos y el
linter:

```bash
npx tsc --noEmit
npx eslint <archivos tocados> --max-warnings=0
```

## Backend (Supabase)

Las migraciones, políticas de Row Level Security y Edge Functions viven en
`web/supabase/`. Con el proyecto de Supabase enlazado localmente (
[CLI de Supabase](https://supabase.com/docs/guides/cli)), los comandos
típicos de desarrollo (`supabase db pull`, `supabase functions deploy`) se
ejecutan desde `web/`.

Toda tabla nueva debe llevar sus políticas de Row Level Security antes de
considerarse terminada (ver reglas en `CLAUDE.md`).

## Inteligencia artificial

Todas las llamadas a la API de Claude ocurren desde Edge Functions
(`web/supabase/functions/`), nunca desde la app.

## Sistema de diseño

Dirección visual: minimalismo elegante tipo shadcn/ui — tarjetas con bordes
redondeados suaves, mucho espacio en blanco, tipografía clara con jerarquía
marcada, íconos delgados de un solo trazo (sin emojis), sombras muy sutiles
en vez de bordes duros.

## Convenciones del proyecto

- Sin emojis en ningún lugar de la app, notificaciones o commits.
- Todo texto visible al usuario en español (es-419), con acentos correctos.

Ver [`CLAUDE.md`](CLAUDE.md) para el resto de reglas no negociables del
proyecto.
