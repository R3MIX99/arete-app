# Areté

Aplicación móvil (iOS y Android) para gimnasios. Los entrenadores crean y
asignan rutinas de entrenamiento y planes de nutrición a sus clientes, con
apoyo de inteligencia artificial. Tres roles: superadministrador,
entrenador y cliente.

Consulta [`CLAUDE.md`](CLAUDE.md) para las reglas de desarrollo del
proyecto y [`Fases-Desarrollo-App-Gym.md`](Fases-Desarrollo-App-Gym.md)
para el plan de fases.

## Estructura del repositorio

Monorepo con cuatro carpetas principales:

```
app/         App Flutter (iOS y Android)
supabase/    Migraciones, políticas RLS y Edge Functions
ai/          Prompt de sistema y utilidades de IA (ai/system.md)
docs/        Documentación del proyecto
```

## Stack técnico

- **App:** Flutter (Dart), Riverpod (estado), go_router (navegación).
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions, Realtime,
  pgvector).
- **IA:** API de Claude, invocada únicamente desde Edge Functions.
- **Pagos:** Stripe, gestionado fuera de la app (sitio web externo).
- **Notificaciones:** Firebase Cloud Messaging.

## Requisitos previos

- [Flutter SDK](https://docs.flutter.dev/get-started/install) (canal
  stable; este proyecto se generó con Flutter 3.41).
- Un proyecto de [Supabase](https://supabase.com) (URL y clave anónima
  publicable).
- Xcode (para iOS) y/o Android Studio (para Android) con sus toolchains
  instaladas.

## Cómo levantar la app en local

1. Entra a la carpeta de la app:

   ```bash
   cd app
   ```

2. Instala las dependencias:

   ```bash
   flutter pub get
   ```

3. Crea tu archivo de variables de entorno a partir de la plantilla. Este
   archivo **no se sube al repositorio** (ver `.gitignore`):

   ```bash
   cp .env.example .env
   ```

   Edita `.env` y coloca la URL y la clave anónima publicable de tu
   proyecto de Supabase (Project Settings → API en el panel de Supabase):

   ```
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=tu-clave-anonima-publica
   ```

4. Corre la app en un emulador, simulador o dispositivo conectado:

   ```bash
   flutter run
   ```

5. Antes de dar cualquier cambio por terminado, corre el linter y las
   pruebas:

   ```bash
   flutter analyze
   flutter test
   ```

## Backend (Supabase)

Las migraciones, políticas de Row Level Security y Edge Functions viven en
`supabase/`. Cuando el proyecto de Supabase esté enlazado localmente con la
[CLI de Supabase](https://supabase.com/docs/guides/cli), los comandos
típicos de desarrollo (`supabase start`, `supabase db push`, `supabase
functions serve`) se ejecutan desde la raíz del repositorio.

Toda tabla nueva debe llevar sus políticas de Row Level Security antes de
considerarse terminada (ver reglas en `CLAUDE.md`).

## Inteligencia artificial

Todas las llamadas a la API de Claude ocurren desde Edge Functions, nunca
desde la app Flutter. El prompt de sistema compartido por todas esas
funciones vive en [`ai/system.md`](ai/system.md) y se carga una sola vez,
sin reescribirse dentro de cada función.

## Convenciones del proyecto

- Sin emojis en ningún lugar de la app, notificaciones o commits.
- Todo texto visible al usuario en español (es-419), con acentos
  correctos.
- Arquitectura por features dentro de `app/lib/features/` (`auth`,
  `trainer`, `client`, `superadmin`, `shared`), más código transversal en
  `app/lib/core/` (configuración, enrutamiento, tema, widgets base).

Ver [`CLAUDE.md`](CLAUDE.md) para el resto de reglas no negociables del
proyecto.
