# CLAUDE.md — App Gym

Este archivo se lee automáticamente por Claude Code al trabajar en este repositorio. Contiene el contexto y las reglas que deben respetarse en cada fase de desarrollo, sin importar qué módulo se esté construyendo.

## Qué es este proyecto

Aplicación móvil (iOS y Android) para gimnasios. Los entrenadores crean y asignan rutinas de entrenamiento y planes de nutrición a sus clientes, con apoyo de inteligencia artificial. Existen tres roles con paneles distintos: superadministrador, entrenador y cliente.

Documento de fases de desarrollo: `Fases-Desarrollo-App-Gym.md` (en la raíz o carpeta `docs/`). Cada fase se pega como prompt independiente; este archivo complementa esas instrucciones y no debe repetirse en cada prompt.

## Stack técnico

- **App:** Next.js (App Router, TypeScript, Tailwind v4, shadcn/ui), empaquetada con Capacitor para Android/iOS como wrapper delgado que carga la web real por `server.url` (no lleva el build de Next.js adentro).
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions, Realtime, extensión pgvector).
- **IA:** API de Claude (Anthropic), invocada únicamente desde Edge Functions (nunca desde el cliente, para no exponer la API key).
- **Pagos:** Stripe, gestionado desde el sitio web externo (no dentro de la app). La app solo lee el estado de la suscripción desde Supabase.
- **Video:** enlaces de YouTube (no se almacena video propio).
- **Repositorio:** `web/` (Next.js + Capacitor + `web/supabase/` con migraciones, políticas RLS y Edge Functions), `docs/`.

## Reglas no negociables

1. **Sin emojis en ningún lugar**: ni en la interfaz, ni en textos generados por IA, ni en notificaciones, ni en commits o nombres de archivos visibles al usuario. Usar únicamente íconos del sistema de diseño definido en la Fase 0.
2. **Idioma:** todo texto visible al usuario debe estar en español correcto para Latinoamérica (es-419), con acentos y ortografía revisados. Usar "tú", no "vos", salvo instrucción explícita en contrario. El código (nombres de variables, funciones, archivos) va en inglés.
3. **Seguridad de datos:** toda tabla nueva en Supabase debe llevar políticas de Row Level Security antes de considerarse terminada. Un entrenador solo accede a sus propios clientes y contenido; un cliente solo accede a su propia información; el superadmin accede a todo.
4. **IA solo desde el backend:** ninguna llamada directa a la API de Claude desde la app. Siempre a través de Edge Functions.
5. **Pagos fuera de la app:** ningún flujo de cobro ni mención de precios ocurre dentro de la interfaz de la app. Los botones relacionados con el plan abren el navegador del sistema hacia el sitio web.
6. **No diagnosticar ni prescribir medicina:** la app y la IA generan rutinas y planes de alimentación con fines de entrenamiento general. Cualquier texto generado que toque temas de salud debe evitar lenguaje de diagnóstico médico y, cuando el contexto lo amerite (lesiones, condiciones médicas declaradas por el cliente), sugerir consultar a un profesional de la salud.
7. **Consistencia visual:** respetar el sistema de diseño (paleta, tipografía, iconografía) definido en la Fase 0; no introducir componentes o estilos nuevos sin necesidad.

## Modelo de datos: rutinas, ejercicios y series

Este es el esquema de referencia para todo lo relacionado con entrenamiento. No debe simplificarse a "una rutina tiene reps y series como texto libre"; cada serie es un registro independiente para permitir series distintas dentro del mismo ejercicio (por ejemplo, series piramidales) y seguimiento real de progreso.

- `exercises`: catálogo de ejercicios (nombre, grupo muscular, equipo, descripción, enlace de video de YouTube, trainer_id).
- `routines`: rutina como plantilla (nombre, descripción, objetivo, nivel, trainer_id).
- `routine_exercises`: relación entre una rutina y un ejercicio específico (routine_id, exercise_id, orden, notas del entrenador).
- `routine_exercise_sets`: cada serie individual de ese ejercicio dentro de la rutina (routine_exercise_id, número de serie, repeticiones mínimas objetivo, repeticiones máximas objetivo, peso sugerido opcional, segundos de descanso, rir_target opcional para entrenadores que trabajan con repeticiones en reserva).
- `programs` / `program_routines`: agrupan rutinas en un plan de varias semanas, asignando qué rutina corresponde a qué día.
- `client_sessions`: una sesión de entrenamiento concreta que el cliente inició (client_id, referencia a la rutina/día asignado, started_at, finished_at, duration_seconds, status: in_progress, completed o abandoned). Es la sesión activa que permite retomar el progreso si el cliente sale de la app antes de terminar.
- `client_set_logs`: registro real de lo que el cliente ejecutó por serie (routine_exercise_set_id, session_id, client_id, repeticiones reales, peso real, rir_actual opcional, is_completed, hora de actualización). Se escribe apenas el cliente llena un valor (autoguardado), no solo cuando confirma la serie como terminada; esto es lo que permite recuperar el progreso exacto de una sesión sin terminar.

Ejemplo de cómo se muestra al cliente: para el ejercicio "Press de banca" con 3 series configuradas como (12 reps / peso ligero), (10 reps / peso medio) y (8 reps / peso pesado), la pantalla debe mostrar cada serie por separado: "Serie 1 de 3 — de 10 a 12 repeticiones", "Serie 2 de 3 — de 8 a 10 repeticiones", etc., y permitir marcar cada serie como completada con el peso y repeticiones reales usados. Esto alimenta tanto el módulo de Seguimiento de Progreso del entrenador como el puntaje de IA de la rutina.

## Modelo de datos: alimentos, platillos y planes nutricionales

Este es el esquema de referencia para todo lo relacionado con nutrición. La sustitución de alimentos es automática y basada en categorías, nunca depende de que el entrenador apruebe sustituto por sustituto.

- `food_categories`: categorías del catálogo (proteína, carbohidrato, verdura o ensalada, fruta, grasa, lácteo, bebida, entre otras). Es la clave de la sustitución automática: solo se sustituyen alimentos dentro de la misma categoría.
- `foods`: catálogo de ingredientes individuales (nombre, food_category_id, calorías/proteína/carbohidratos/grasas por 100 g, household_unit_name y household_unit_grams para la equivalencia en medida casera, trainer_id nullable: nulo es genérico, con valor es un alimento personalizado de ese entrenador).
- `dishes` / `dish_ingredients`: un platillo compuesto (por ejemplo "huevos con verduras") y la lista de alimentos que lo forman con su cantidad en gramos. La medida casera de cada ingrediente dentro del platillo se calcula en tiempo real a partir de `household_unit_grams`, no se guarda fija.
- `get_food_substitutes(food_id, quantity_grams, tolerance_percent)`: función/vista en Supabase que devuelve alternativas dentro de la misma categoría, con calorías y proteína dentro del rango de tolerancia, y la cantidad ya ajustada. Es la única fuente de sustituciones; no existe una tabla de "sustitutos aprobados manualmente" por el entrenador.
- `diet_plans` / `diet_plan_meals`: plan de alimentación como plantilla reutilizable (no atado a un cliente), organizado por comida del día, compuesto de platillos y/o alimentos individuales. Se asigna a uno o varios clientes igual que un programa de entrenamiento.
- `client_meal_substitutions`: registro de cada sustitución que hizo un cliente en su día a día (alimento original, alimento sustituto, cantidad, fecha), visible para el entrenador.

## Dirección visual del diseño

Referencia aprobada por el cliente del proyecto: estética minimalista tipo shadcn/ui — tarjetas con bordes redondeados suaves, mucho espacio en blanco, tipografía clara con jerarquía marcada (títulos grandes, texto secundario en gris), íconos delgados de un solo trazo (sin emojis), sombras muy sutiles en vez de bordes duros, gráficas simples e integradas en tarjetas (no como elementos separados y recargados), y barra de navegación inferior de cuatro o cinco íconos con el ítem activo resaltado. Se implementa con componentes reales de shadcn/ui sobre Tailwind, no una imitación. La paleta de colores exacta (tonos, modo oscuro o claro) todavía no está definida y se debe confirmar antes de aplicar colores finales; hasta entonces, usar una paleta neutra provisional (blancos, grises, un color de acento) que pueda reemplazarse sin rehacer la estructura de los componentes.

## Patrón de UX para la sesión de entrenamiento del cliente

La pantalla de sesión de entrenamiento (Panel de Cliente, pestaña Entrenamiento, detallada en la Fase 9 del documento de fases) sigue un patrón validado por referencia de producto: toda la rutina del día vive en una sola página con scroll, sin pantallas intermedias de "siguiente ejercicio" o "siguiente serie". Cada ejercicio es una tarjeta expandible con su video, un ícono de histórico (gráfica de peso por mes), un ícono de notas, series editables en tabla (repeticiones y peso como inputs), y un botón de completar por serie. El histórico de cada ejercicio se abre y se cierra sin perder el contexto de la rutina. Cualquier pantalla nueva relacionada con entrenamiento debe respetar este patrón salvo que el usuario indique lo contrario explícitamente.

## Flujo de trabajo con Claude Code

- Trabajar una fase del documento `Fases-Desarrollo-App-Gym.md` a la vez. No adelantar funcionalidad de fases posteriores salvo que se indique explícitamente.
- Al terminar una fase, ejecutar linter y pruebas antes de dar la fase por concluida.
- Si se detecta un texto con emoji, error ortográfico o falta de acento durante cualquier fase, corregirlo de inmediato aunque no sea el foco de esa fase.
- Ante cualquier ambigüedad de alcance, preferir la opción más simple que cumpla el requisito, y dejar una nota en el resumen final de la fase indicando la decisión tomada.
