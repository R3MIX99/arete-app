# App Gym — Documento de Fases de Desarrollo

Documento de referencia para desarrollar la aplicación con Claude Code, fase por fase. Cada fase incluye un prompt listo para pegar. Se recomienda copiar una fase completa por sesión y esperar a que quede terminada y probada antes de avanzar a la siguiente.

---

## 1. Resumen del producto

Aplicación móvil (iOS y Android) para gimnasios, orientada a entrenadores que asignan rutinas de entrenamiento y planes de nutrición a sus clientes desde una sola plataforma. Incluye generación de rutinas y dietas asistida por inteligencia artificial, seguimiento de progreso, biblioteca de ejercicios en video y tres paneles con roles distintos: superadministrador, entrenador y cliente.

Reglas transversales que aplican a todas las fases:

- No usar emojis en ninguna parte de la interfaz. Usar únicamente íconos (biblioteca de íconos consistente en toda la app).
- Todo el texto debe estar en español correcto para Latinoamérica, con acentos y ortografía revisados (evitar "voseo" salvo que se pida explícitamente; usar "tú" neutro).
- Diseño responsive, accesible (contraste adecuado, tamaños de fuente legibles, soporte de lector de pantalla en elementos clave).
- Código organizado por features/módulos, con nombres de archivos y variables en inglés (convención estándar), pero textos visibles en español.

---

## 2. Tecnologías recomendadas

| Capa | Tecnología | Motivo |
|---|---|---|
| App móvil | **Flutter (Dart)** | Un solo código para iOS y Android, mejor rendimiento que alternativas híbridas, componentes maduros para calendario (`table_calendar`), gráficas (`fl_chart`), reproducción de YouTube (`youtube_player_flutter`) y publicación más predecible en ambas tiendas. |
| Backend / Base de datos | **Supabase** (Postgres + Auth + Storage + Edge Functions + Realtime) | Base de datos relacional robusta, autenticación con roles integrada, almacenamiento de archivos para documentos/rutinas, funciones serverless para IA, y soporte de `pgvector` para búsquedas semánticas (necesario para "nutrir" la IA). |
| Inteligencia artificial | **Claude (Anthropic API)** | Generación de rutinas y dietas, análisis y puntaje de rutinas, y sistema de aprendizaje desde documentos/videos que sube el superadmin mediante RAG (embeddings + `pgvector` en Supabase). |
| Repositorio y versionado | **GitHub** | Repositorio único (monorepo) con carpetas `app/` (Flutter) y `supabase/` (migraciones, funciones, políticas). Integración directa con Claude Code. |
| CI/CD y publicación en tiendas | **Codemagic** o **GitHub Actions + Fastlane** | Automatiza builds, firma de certificados y subida a Play Store y App Store. |
| Pagos y suscripciones | **Stripe**, gestionado desde el sitio web (checkout externo, estilo Spotify) | Evita la comisión de Apple/Google al no procesar el pago dentro de la app. Dentro de la app solo se muestra el estado del plan; el usuario gestiona su suscripción abriendo el navegador hacia el sitio web. Esto debe respetar las políticas de "external purchase" de cada tienda (se detalla en la Fase 15). |
| Notificaciones push | **Firebase Cloud Messaging (FCM)** | Estándar de la industria, compatible con Flutter en ambas plataformas. |
| Video de ejercicios | **YouTube (enlaces embebidos)** | El entrenador sube el video a YouTube (público o no listado) y solo pega el enlace en la app; evita costos de almacenamiento de video propio. |

### Nota sobre publicación en tiendas

Ambas tiendas requieren cuenta de desarrollador: Google Play (pago único de USD 25) y Apple Developer Program (USD 99 anuales). Se recomienda iniciar el proceso de alta de la cuenta de Apple desde la Fase 0, porque la revisión de la cuenta puede tardar varios días.

---

## 3. Arquitectura general

- **App Flutter** con tres flujos de navegación según el rol del usuario autenticado (superadmin, entrenador, cliente), determinados por una tabla `profiles` en Supabase con campo `role`.
- **Supabase Auth** para registro/login (correo y contraseña, y opcionalmente Google/Apple Sign-In, requerido por Apple si se ofrece login social).
- **Row Level Security (RLS)** en todas las tablas para que cada entrenador solo vea a sus clientes, y cada cliente solo vea su propia información.
- **Edge Functions** para: (a) llamadas a la API de Claude, (b) procesamiento de documentos/videos que sube el superadmin para la IA, (c) webhooks de Stripe.
- **Storage** de Supabase para documentos y archivos que alimentan la IA (los videos de ejercicios no se almacenan aquí, solo el enlace de YouTube).

---

## 4. Fases de desarrollo

Cada fase trae un prompt para pegar directamente en Claude Code. Ajusta rutas o nombres si tu proyecto ya tiene una estructura distinta.

### Fase 0 — Configuración inicial del proyecto

**Objetivo:** dejar listo el repositorio, el proyecto Flutter y el proyecto Supabase conectados entre sí.

```
Actúa como arquitecto de software senior. Vamos a iniciar un proyecto nuevo llamado "App Gym".

Contexto del producto: aplicación móvil (iOS y Android) para gimnasios, donde entrenadores crean y asignan rutinas de entrenamiento y planes de nutrición a sus clientes, con apoyo de inteligencia artificial. Hay tres roles: superadministrador, entrenador y cliente.

Tareas de esta fase:
1. Crear un proyecto Flutter llamado "app_gym" con arquitectura por features (carpetas: features/auth, features/trainer, features/client, features/superadmin, features/shared, core/).
2. Configurar gestión de estado con Riverpod.
3. Configurar el paquete oficial de Supabase para Flutter (supabase_flutter) con variables de entorno mediante archivos .env (no subir credenciales al repositorio).
4. Configurar enrutamiento con go_router, separando rutas por rol.
5. Definir el sistema de diseño base con estética minimalista (referencia: interfaces tipo shadcn/ui): tarjetas con bordes redondeados suaves, mucho espacio en blanco, tipografía con jerarquía clara, íconos delgados de un solo trazo (usa Material Symbols o Phosphor Icons, sin emojis en ningún lugar de la app), sombras sutiles en vez de bordes duros. Usa una paleta neutra provisional (blancos, grises y un solo color de acento) construida con tokens de color reutilizables (no colores repetidos a mano en cada pantalla), para poder reemplazarla fácilmente cuando se defina la paleta final de marca.
6. Configurar internacionalización con español (es-419 / Latinoamérica) como idioma único por ahora, revisando que todos los textos de ejemplo usen acentos correctos.
7. Inicializar repositorio Git y dejar estructura lista para subir a GitHub, incluyendo .gitignore adecuado para Flutter y Supabase.
8. Documentar en un README.md cómo levantar el proyecto localmente.

No implementes pantallas funcionales todavía, solo la base del proyecto. Al terminar, dame un resumen de la estructura de carpetas creada.
```

---

### Fase 1 — Autenticación y roles

**Objetivo:** login, registro y separación de flujos por rol.

```
Continuamos con el proyecto "App Gym" (Flutter + Supabase, ya configurado en la fase anterior).

Tareas de esta fase:
1. En Supabase, crea la tabla "profiles" con: id (uuid, referencia a auth.users), full_name, email, role (enum: superadmin, trainer, client), avatar_url, trainer_id (nullable, referencia al entrenador cuando el rol es client), created_at.
2. Configura políticas de Row Level Security: cada usuario solo puede leer y editar su propio perfil; un entrenador puede leer los perfiles de sus clientes (donde trainer_id coincide con su id); el superadmin puede leer todos los perfiles.
3. En Flutter, crea las pantallas de: inicio de sesión, registro (solo para entrenadores y clientes; el superadmin se crea manualmente desde Supabase), recuperación de contraseña.
4. Después del login, redirige automáticamente según el rol: superadmin va al panel de superadministrador, trainer va al panel de entrenador, client va al panel de cliente.
5. Implementa un flujo de invitación: el entrenador podrá invitar a un cliente por correo (esto se conecta con la lógica que implementaremos en la Fase 5, por ahora solo deja la estructura de datos lista).
6. Cuida la redacción de todos los textos: es-419, sin errores ortográficos, sin emojis, solo íconos.
7. Maneja los estados de carga y error de forma clara (sin tecnicismos para el usuario final).

Al terminar, prueba el flujo completo de registro y login para un usuario de cada rol y confírmame que funciona.
```

---

### Fase 2 — Panel de Entrenador: Dashboard y navegación

**Objetivo:** estructura general del panel del entrenador.

```
Continuamos con "App Gym". Ahora vamos a construir el Panel de Entrenador, que es el centro de administración de la plataforma.

Contexto: el entrenador gestiona de forma integral a sus clientes: crea y asigna rutinas, dietas y programas, sube videos de ejercicios (por enlace de YouTube), hace seguimiento del progreso de cada cliente, y usa herramientas de IA para generar rutinas y dietas.

Tareas de esta fase:
1. Crea la navegación principal del panel de entrenador con estos módulos: Dashboard, Clientes, Rutinas, Biblioteca de Ejercicios, Programas, Planes Nutricionales, Calendario, Seguimiento de Progreso, Configuración.
2. Construye el Dashboard de control con: resumen de número de clientes activos, rutinas creadas, próximas sesiones del día, alertas de clientes sin actividad reciente, y accesos directos a las acciones más usadas (crear rutina, crear dieta, agregar cliente).
3. Usa datos de ejemplo (mock) por ahora; en fases posteriores se conectan a datos reales de Supabase.
4. Aplica el sistema de diseño ya definido (sin emojis, solo íconos, textos en español correcto).
5. Asegura que la navegación funcione correctamente en distintos tamaños de pantalla (teléfonos y tablets).

Al terminar, muéstrame cómo quedó organizada la navegación del panel.
```

---

### Fase 3 — Panel de Entrenador: Gestión de Clientes

**Objetivo:** alta, edición y visualización de clientes.

```
Seguimos con el Panel de Entrenador de "App Gym".

Tareas de esta fase:
1. Crea el módulo "Gestión de Clientes" con: listado de clientes (con buscador y filtros por estado: activo, inactivo, plan), vista de detalle de cada cliente (datos personales, objetivos, plan actual, rutina y dieta asignadas, progreso reciente).
2. Implementa el formulario de alta de cliente: datos básicos, objetivo principal (perder peso, ganar músculo, mantenimiento, rendimiento), restricciones alimentarias o de salud relevantes.
3. Conecta este módulo a la tabla "profiles" de Supabase (rol client, con trainer_id igual al entrenador autenticado), respetando las políticas de seguridad ya definidas.
4. Implementa edición y baja (desactivación, no borrado físico) de clientes.
5. Agrega validaciones de formulario claras, con mensajes de error en español correcto.

Al terminar, prueba el flujo completo: crear un cliente, verlo en el listado, editarlo y desactivarlo.
```

---

### Fase 4 — Biblioteca de Ejercicios y Rutinas de Entrenamiento

**Objetivo:** catálogo de ejercicios y creación de rutinas.

```
Seguimos con el Panel de Entrenador de "App Gym".

Tareas de esta fase:
1. Crea la tabla "exercises" en Supabase: nombre, grupo muscular, equipo necesario, descripción, enlace de video de YouTube (validar que sea una URL válida de YouTube), creado por (trainer_id).
2. Construye el módulo "Biblioteca de Ejercicios": listado con filtros por grupo muscular y equipo, buscador, formulario para crear/editar ejercicio (incluye reproductor embebido para previsualizar el video de YouTube).
3. Crea las tablas "routines" (nombre, descripción, objetivo, nivel, trainer_id), "routine_exercises" (routine_id, exercise_id, orden, notas) y "routine_exercise_sets" (routine_exercise_id, número de serie, repeticiones mínimas objetivo, repeticiones máximas objetivo, peso sugerido opcional, segundos de descanso). Cada serie es un registro independiente, no un número fijo por ejercicio, para poder definir series distintas dentro del mismo ejercicio (por ejemplo, series piramidales: primera serie más liviana y repeticiones altas, última serie más pesada y repeticiones bajas).
4. Construye el módulo "Rutinas de Entrenamiento": creación de rutina agregando ejercicios de la biblioteca; por cada ejercicio, el entrenador define cuántas series tendrá y configura individualmente el rango de repeticiones, peso sugerido y descanso de cada serie; reordenar ejercicios (arrastrar y soltar); duplicar rutina existente como plantilla.
5. Crea la tabla "client_set_logs" (routine_exercise_set_id, client_id, fecha de sesión, repeticiones reales, peso real, hora de finalización) que se usará en la Fase 9 para que el cliente registre lo que realmente hizo en cada serie.
5. Deja preparado (sin implementar aún) el punto donde más adelante se conectará el análisis de IA que le da un puntaje a cada rutina (lo construiremos en la Fase 8).

Al terminar, prueba crear un ejercicio nuevo con su video, y armar una rutina completa usando varios ejercicios.
```

---

### Fase 5 — Programas y asignación a clientes

**Objetivo:** agrupar rutinas en programas y asignarlas.

```
Seguimos con el Panel de Entrenador de "App Gym".

Tareas de esta fase:
1. Crea la tabla "programs" (agrupa varias rutinas en un plan de varias semanas: nombre, duración en semanas, objetivo, trainer_id) y "program_routines" (qué rutina corresponde a qué día/semana dentro del programa).
2. Construye el módulo "Programas": creación de un programa asignando rutinas a días específicos de cada semana.
3. Implementa la asignación de un programa (o de una rutina suelta) a uno o varios clientes, con fecha de inicio.
4. Al asignar, el cliente debe poder verlo automáticamente en su calendario (esto se conecta con el Panel de Cliente que construiremos en la Fase 9).
5. Agrega la posibilidad de que el entrenador reemplace o ajuste una rutina específica para un cliente puntual, sin afectar la plantilla original del programa.

Al terminar, prueba asignar un programa completo a un cliente de ejemplo.
```

---

### Fase 6 — Catálogo de Alimentos, Platillos y Planes Nutricionales

**Objetivo:** construir un catálogo de alimentos y platillos organizado por categorías, con sustitución automática por macronutrientes (sin que el entrenador tenga que aprobar sustituto por sustituto), y planes de alimentación reutilizables que se puedan asignar a varios clientes, igual que las rutinas y programas.

```
Seguimos con el Panel de Entrenador de "App Gym".

Contexto de esta fase: el catálogo de alimentos debe permitir que, si a un cliente le falta un ingrediente de su comida (por ejemplo huevo), la app le muestre automáticamente alternativas equivalentes dentro de la misma categoría (por ejemplo pollo, carne o queso, como otras fuentes de proteína), sin que el entrenador tenga que definir esa sustitución manualmente para cada comida. Además, el entrenador debe poder crear platillos compuestos (por ejemplo "huevos con verduras") detallando cada ingrediente con su cantidad en gramos y, cuando sea razonable, una equivalencia en medidas caseras (por ejemplo "120 g de huevo ≈ 3 huevos medianos") para que el cliente no dependa de una báscula.

Tareas de esta fase:

1. Crea la tabla "food_categories" con categorías base: proteína, carbohidrato, verdura o ensalada, fruta, grasa, lácteo, bebida (agrega las que consideres necesarias para cubrir un plato típico latinoamericano). Esta categoría es la clave de la sustitución automática: dos alimentos de la misma categoría son intercambiables entre sí si sus macros son cercanos.

2. Crea la tabla "foods" (catálogo base de ingredientes individuales, no platillos): nombre, food_category_id, calorías, proteína, carbohidratos y grasas por cada 100 g, un campo "household_unit_name" (nombre de una medida casera común, por ejemplo "huevo mediano", "rebanada de pan", "cucharada"), un campo "household_unit_grams" (a cuántos gramos equivale esa medida casera), y "trainer_id" nullable: si es nulo, el alimento es genérico (disponible para todos los entrenadores); si tiene un trainer_id, es un alimento personalizado creado por ese entrenador.

3. Precarga (seed) un catálogo genérico inicial con alimentos comunes de la dieta latinoamericana (huevo, pollo, carne de res, atún, queso panela, frijoles, arroz, tortilla, pan, avena, plátano, manzana, aguacate, aceite de oliva, leche, yogur, etc.), cada uno con su categoría y su medida casera correspondiente, para que el catálogo no arranque vacío.

4. Crea una función o vista en Supabase "get_food_substitutes(food_id, quantity_grams, tolerance_percent)" que, dado un alimento y la cantidad usada en una comida, calcule sus calorías y proteína en esa cantidad, y devuelva otros alimentos de la misma categoría (genéricos más los del entrenador correspondiente) cuya cantidad equivalente en calorías y proteína caiga dentro del rango de tolerancia (por ejemplo 15% por defecto, configurable), con la cantidad en gramos ya ajustada para que el sustituto se acerque lo más posible al original. Esta función es la que usará el cliente para sustituir alimentos automáticamente en la Fase 10; no requiere que el entrenador apruebe cada sustitución.

5. Crea las tablas "dishes" (platillo compuesto: nombre, food_category_id opcional si aplica una categoría general del platillo, meal_type sugerido: desayuno, almuerzo, cena, snack, trainer_id nullable igual que en "foods" para diferenciar genérico vs. personalizado, descripción) y "dish_ingredients" (dish_id, food_id, quantity_grams, orden). No se guarda la medida casera del ingrediente en cada platillo: se calcula en tiempo real dividiendo "quantity_grams" entre "household_unit_grams" del alimento, redondeando a una fracción razonable (por ejemplo cuartos o medios), para mostrar algo como "4 huevos" o "2 y 1/2 rebanadas de pan".

6. Construye el módulo "Alimentos y Platillos" en el panel del entrenador: buscador y filtros por categoría sobre el catálogo genérico más el propio del entrenador; formulario para crear un alimento individual nuevo; formulario para crear un platillo nuevo agregando ingredientes uno por uno con su cantidad en gramos, mostrando en vivo la vista previa de la medida casera calculada y los totales nutricionales del platillo completo (suma de sus ingredientes).

7. Crea las tablas "diet_plans" (plantilla reutilizable de alimentación: nombre, objetivo del plan como texto libre o categoría, por ejemplo "déficit calórico alto en proteína", objetivo calórico diario, trainer_id) y "diet_plan_meals" (a qué comida del día pertenece: desayuno, almuerzo, cena, snack, y qué platillos o alimentos individuales la componen, cada uno con su cantidad). Un "diet_plan" no está atado a un cliente específico: es una plantilla, igual que las rutinas y los programas.

8. Construye el módulo "Planes Nutricionales" con este flujo: el entrenador arma un plan de alimentación completo como plantilla (agregando platillos del catálogo o alimentos individuales a cada comida del día), ve los totales de calorías y macronutrientes calculados automáticamente, y guarda el plan con un nombre reutilizable (por ejemplo "Plan definición 1800 kcal"). Después puede asignar ese mismo plan a uno o varios clientes desde una pantalla de asignación, igual que se hace con los programas de entrenamiento en la Fase 5. Al asignar, el sistema ajusta proporcionalmente las porciones si el objetivo calórico del cliente difiere del objetivo original del plan, y deja ver ese ajuste antes de confirmar.
9. Permite además asignar directamente un plan a un cliente puntual sin pasar por catálogo compartido, para casos muy personalizados que no se quieran reutilizar.

Al terminar, prueba: crear un alimento nuevo, crear un platillo con varios ingredientes y confirmar que la medida casera se calcula bien, crear un plan de alimentación completo como plantilla, asignarlo a dos clientes distintos, y probar la función de sustitutos automáticos sobre un alimento de tipo proteína.
```

---

### Fase 7 — Calendario, Seguimiento de Progreso y Configuración

**Objetivo:** vista consolidada de actividad y ajustes del entrenador.

```
Seguimos con el Panel de Entrenador de "App Gym".

Tareas de esta fase:
1. Construye el módulo "Calendario" del entrenador: vista semanal y mensual con las sesiones de entrenamiento programadas de todos sus clientes, filtrable por cliente.
2. Construye el módulo "Seguimiento de Progreso": por cada cliente, permite registrar y visualizar en gráficas (usa fl_chart) peso corporal, medidas, fotos de progreso (opcional) y cumplimiento de rutinas (porcentaje de sesiones completadas).
3. Construye el módulo "Configuración" del entrenador: datos del perfil, información de negocio (nombre del gimnasio o marca personal), notificaciones, y estado de su plan de suscripción (sin lógica de pago todavía, solo la visualización; la conectaremos en la Fase 15).
4. Asegura consistencia visual y de idioma en los tres módulos.

Al terminar, muéstrame cómo se ve el calendario con varias sesiones de distintos clientes.
```

---

### Fase 8 — Herramientas de IA para el Entrenador

**Objetivo:** generación de rutinas/dietas con IA y puntaje de rutinas.

```
Seguimos con "App Gym". Ahora vamos a integrar la inteligencia artificial en el Panel de Entrenador, usando la API de Claude (Anthropic) a través de una Edge Function de Supabase (para no exponer la API key en el cliente).

Tareas de esta fase:
1. Crea una Edge Function "generate-routine" que reciba el objetivo del cliente, nivel, días disponibles y equipo, y devuelva una rutina estructurada (usando el catálogo de ejercicios existente cuando sea posible, y sugiriendo ejercicios nuevos si hace falta).
2. Crea una Edge Function "generate-diet" que reciba objetivo calórico, preferencias y restricciones del cliente, y devuelva un plan de alimentación estructurado como plantilla reutilizable, usando de preferencia platillos ya existentes en el catálogo del entrenador o el catálogo genérico ("dishes"), y alimentos individuales del catálogo ("foods") cuando no exista un platillo adecuado.
3. En el módulo de Rutinas, agrega un botón "Generar con IA" que llame a la función anterior y permita al entrenador revisar, editar y guardar el resultado antes de asignarlo.
4. Haz lo mismo en el módulo de Planes Nutricionales con "Generar con IA".
5. Crea una Edge Function "score-routine" que analice una rutina creada manualmente o generada, y le asigne un puntaje (por ejemplo de 0 a 100) según balance muscular, progresión y coherencia con el objetivo declarado, junto con una breve justificación en texto.
6. Muestra ese puntaje de forma visual (no numérica fría, con una barra o indicador) dentro del detalle de la rutina.
7. Maneja límites de uso razonables y estados de carga/error claros mientras la IA procesa la solicitud.

Al terminar, prueba generar una rutina y una dieta completas con IA, y revisa el puntaje asignado a una rutina de ejemplo.
```

---

### Fase 9 — Panel de Cliente: Inicio y Entrenamiento

**Objetivo:** experiencia del cliente para ver su rutina en calendario.

```
Seguimos con "App Gym". Ahora construimos el Panel de Cliente.

Contexto: el cliente ve sus rutinas y su dieta. Tiene cuatro pestañas: Inicio, Entrenamiento, Nutrición y Perfil.

Tareas de esta fase:
1. Construye la navegación inferior con las cuatro pestañas mencionadas.
2. Pestaña "Inicio": resumen del día (sesión de entrenamiento de hoy si existe, comidas del día, mensaje o nota reciente del entrenador, racha de cumplimiento).
3. Pestaña "Entrenamiento": calendario con vista semanal y mensual (usa table_calendar) que muestra las sesiones asignadas por día. Al tocar un día con sesión, se abre la pantalla de la sesión completa (ver punto 4), no una vista separada por ejercicio.
4. Construye la pantalla de sesión de entrenamiento con este patrón de interacción, en una sola página con scroll (todo lo demás ocurre sin salir de esta pantalla):
   - Encabezado con el nombre de la sesión/rutina y un ícono de temporizador de descanso siempre accesible.
   - Los ejercicios se agrupan por bloque cuando la rutina lo defina (por ejemplo "Calentamiento", "Bloque principal"), cada bloque como una sección colapsable con su propio encabezado.
   - Cada ejercicio se muestra como una tarjeta con: miniatura/video del ejercicio (reproducible sin salir de la pantalla), nombre del ejercicio, un ícono de gráfica que abre el histórico del ejercicio (ver punto 5), un ícono de notas para ver o dejar comentarios del entrenador o del cliente sobre ese ejercicio, y un ícono de calculadora para conversión o ajuste rápido de peso (por ejemplo, por disco o por porcentaje).
   - Debajo del nombre, un resumen compacto con ícono de bandera indicando "X series x rango de repeticiones" (usa el rango mínimo-máximo de "routine_exercise_sets") y, si el ejercicio tiene RIR objetivo configurado, mostrarlo también (ver ajuste al modelo de datos en el punto 8).
   - Un indicador con ícono de reloj mostrando los segundos de descanso configurados para ese ejercicio.
   - Una tabla editable con columnas Series, Repeticiones y Peso (kg): una fila por cada serie configurada en "routine_exercise_sets", con los campos de repeticiones y peso como inputs numéricos que el cliente llena mientras entrena, y un botón circular de marca de verificación al final de cada fila para marcar esa serie como completada de forma independiente (no se requiere completar toda la tarjeta de una vez).
   - Un botón "Completar" en la tarjeta del ejercicio para marcar todas sus series como hechas de una vez, y una opción "Insertar marcas" para agregar una serie adicional no planeada originalmente (por ejemplo, una serie extra que el cliente decidió hacer).
   - Al completar una serie, dispara automáticamente (sin bloquear la pantalla ni mostrar una interrupción de "siguiente serie") el conteo del descanso configurado, visible como un indicador no intrusivo.
   - Un botón "Terminar" fijo en la parte inferior de la pantalla que cierra la sesión completa cuando el cliente decide finalizar, sin exigir que todas las series estén marcadas.
5. Construye la pantalla de "Histórico" por ejercicio, accesible desde el ícono de gráfica de cada tarjeta sin salir del contexto de la rutina (navegación tipo modal o pantalla apilada que regresa directamente a la sesión). Debe mostrar:
   - Título con el nombre del ejercicio.
   - Selector de meses (pestañas tipo "Junio", "Mayo", "Abril") para navegar el histórico.
   - Gráfica de peso máximo por día a lo largo del mes seleccionado (usa fl_chart), calculada a partir de "client_set_logs".
   - Listado debajo de la gráfica con cada fecha registrada y el peso usado ese día, expandible para ver el detalle de repeticiones por serie de esa fecha.
6. Cada serie marcada como completada (con sus repeticiones y peso reales, y RIR real si aplica) se guarda en "client_set_logs", asociada a la serie planeada ("routine_exercise_set_id"), a la sesión activa ("session_id") y al cliente.
7. Al terminar la sesión completa, márcala como completada en el registro correspondiente y actualiza la racha de cumplimiento mostrada en la pestaña "Inicio".
8. Persistencia de progreso de la sesión (requisito importante): la sesión de entrenamiento debe sobrevivir a cambios de pestaña, cierre de la app o pérdida de conexión, sin perder lo que el cliente ya llevaba escrito.
   - Al abrir una sesión por primera vez, crea un registro en "client_sessions" (id, client_id, referencia a la rutina/día asignado, started_at, status: in_progress) que actúa como sesión activa.
   - Cada vez que el cliente escribe o modifica un valor de repeticiones o peso en cualquier serie, guarda ese valor de inmediato (autoguardado con un pequeño retraso para no saturar la red, por ejemplo 500 ms después de dejar de escribir) en "client_set_logs" asociado a esa sesión, sin esperar a que el cliente presione "Completar". Usa un campo "is_completed" en "client_set_logs" para diferenciar una serie con valores guardados pero no confirmada, de una serie ya marcada como hecha.
   - Guarda también una copia local en el dispositivo (por ejemplo con Hive o shared_preferences) de la sesión activa, para que el progreso sea visible de inmediato aunque no haya conexión en ese momento, y se sincronice con Supabase apenas vuelva la conexión.
   - Si el cliente sale de la pantalla de entrenamiento (cambia de pestaña, sale de la app o la cierra) y luego regresa, la app debe detectar que existe una sesión con status "in_progress" para el día correspondiente y abrirla automáticamente en el mismo punto donde quedó, con todos los valores ya escritos visibles en sus campos.
   - Si el cliente abre la pestaña "Entrenamiento" o la pantalla "Inicio" mientras tiene una sesión sin terminar, muestra un aviso claro (por ejemplo una tarjeta destacada) del tipo "Tienes una sesión sin terminar" con acceso directo para continuarla.
   - Una sesión "in_progress" que no se retoma en un tiempo razonable (por ejemplo, hasta el final del día) debe poder marcarse como "abandoned" mediante un proceso programado, sin que esto borre las series que sí se alcanzaron a completar.
9. Cronómetro de duración de la sesión: al crear el registro en "client_sessions" guarda "started_at"; al presionar "Terminar" guarda "finished_at" y calcula "duration_seconds" como la diferencia entre ambos. Muestra la duración total de la sesión al finalizar (por ejemplo "Sesión completada en 48 minutos") y guárdala para que el entrenador pueda verla en el módulo de Seguimiento de Progreso.
10. Ajuste al modelo de datos: agrega a "routine_exercise_sets" el campo opcional "rir_target" (repeticiones en reserva objetivo, por ejemplo "2-1"); agrega la tabla "client_sessions" (id, client_id, referencia a la rutina/día asignado, started_at, finished_at, duration_seconds, status: in_progress, completed, abandoned); y agrega a "client_set_logs" los campos "session_id" (referencia a client_sessions), "is_completed" y "rir_actual" opcional.
11. Asegura que toda la información mostrada respete las políticas de seguridad (el cliente solo ve su propia información, incluida su sesión activa).

Cuida el diseño visual: usa el sistema de diseño ya definido, con jerarquía clara entre bloques, ejercicios y series, e íconos consistentes (sin emojis). El objetivo es que el cliente pueda ver toda su rutina del día, registrar cada serie y consultar el histórico de cualquier ejercicio sin sentir que salió de la pantalla de entrenamiento, y que pueda irse a mitad de la sesión sin perder nada de lo que ya llevaba avanzado.

Al terminar, prueba el flujo completo: abrir una sesión desde el calendario, llenar algunas series sin marcarlas como completadas, cambiar de pestaña y cerrar la app por completo, volver a abrirla y confirmar que la sesión se retoma con los valores intactos, completar el resto de las series, y finalizar confirmando que se registró correctamente la duración total.
```

---

### Fase 10 — Panel de Cliente: Nutrición

**Objetivo:** ver dieta y sustituir alimentos.

```
Seguimos con el Panel de Cliente de "App Gym".

Tareas de esta fase:
1. Construye la pestaña "Nutrición": muestra el plan de alimentación del día actual, organizado por comida (desayuno, almuerzo, cena, snacks), con totales de calorías y macronutrientes del día y de cada comida. Cada platillo o alimento se muestra con su cantidad en gramos y, cuando aplica, su equivalencia en medida casera (por ejemplo "120 g de huevo (aprox. 3 huevos medianos)").
2. Implementa la sustitución automática: al tocar el ícono de sustituir sobre cualquier alimento o ingrediente de un platillo, llama a la función "get_food_substitutes" (Fase 6) usando la categoría de ese alimento, y muestra de inmediato una lista de alternativas equivalentes en calorías y proteína, cada una con su cantidad ajustada y su medida casera. No requiere ninguna aprobación previa del entrenador; el catálogo por categorías ya garantiza que la alternativa tiene sentido (por ejemplo, un alimento de categoría proteína solo se sustituye por otro de categoría proteína).
3. Si el alimento sustituido forma parte de un platillo compuesto (por ejemplo "huevos con verduras"), la sustitución se aplica solo a ese ingrediente específico dentro del platillo, y el resto de ingredientes del platillo permanece igual.
4. El reemplazo debe reflejarse de inmediato en los totales del día (recalculando calorías y macronutrientes), y quedar registrado en una tabla "client_meal_substitutions" (client_id, fecha, alimento original, alimento sustituto, cantidad) para que el entrenador pueda ver después qué sustituciones hizo el cliente y con qué frecuencia.
5. Agrega una vista semanal simple de la dieta, para que el cliente pueda anticipar los próximos días.
6. Si un alimento no tiene ninguna alternativa dentro del rango de tolerancia configurado, muestra un mensaje claro indicando que no hay sustitutos disponibles en ese momento, en vez de dejar la lista vacía sin explicación.

Al terminar, prueba sustituir un ingrediente dentro de un platillo compuesto y un alimento individual, y confirma que en ambos casos los totales del día se recalculan correctamente y la sustitución queda registrada.
```

---

### Fase 11 — Panel de Cliente: Perfil

**Objetivo:** información personal y ajustes del cliente.

```
Seguimos con el Panel de Cliente de "App Gym".

Tareas de esta fase:
1. Construye la pestaña "Perfil": datos personales editables, objetivo actual, entrenador asignado (con su información de contacto), historial de peso y medidas en formato de gráfica simple.
2. Agrega sección de notificaciones (activar/desactivar recordatorios de entrenamiento y comidas).
3. Agrega sección de plan/suscripción del cliente (solo visualización del estado, sin lógica de pago todavía).
4. Agrega opción de cerrar sesión y de solicitar eliminación de cuenta (requisito habitual de las tiendas de aplicaciones).

Al terminar, confírmame que el flujo de edición de perfil y cierre de sesión funciona correctamente.
```

---

### Fase 12 — Panel de Superadministrador: Dashboard y actividad

**Objetivo:** vista global de la plataforma.

```
Seguimos con "App Gym". Ahora construimos el Panel de Superadministrador.

Contexto: el superadmin da acceso a mejoras de plan, ve toda la actividad en gráficas de entrenadores y clientes, puede otorgar planes gratuitos, y administra la sección de IA.

Tareas de esta fase:
1. Construye el Dashboard del superadmin con gráficas (fl_chart) de: número total de entrenadores activos, número total de clientes activos, crecimiento en el tiempo, entrenadores con más clientes, planes más usados, actividad reciente en la plataforma.
2. Construye el listado de todos los entrenadores registrados, con filtros por plan y estado, y acceso al detalle de cada uno (sus clientes, rutinas creadas, actividad).
3. Construye el listado de todos los clientes registrados, con el mismo nivel de detalle.
4. Asegura que las políticas de seguridad permitan al superadmin leer todos los datos necesarios, pero sin exponer esta capacidad a los otros roles.

Al terminar, muéstrame cómo se ven las gráficas principales del dashboard.
```

---

### Fase 13 — Panel de Superadministrador: Gestión de planes

**Objetivo:** control de suscripciones y beneficios especiales.

```
Seguimos con el Panel de Superadministrador de "App Gym".

Tareas de esta fase:
1. Crea la tabla "plans" (nombre, precio, límites: número de clientes, funciones incluidas) y agrega el campo de plan activo a las tablas de entrenador y cliente.
2. Construye el módulo donde el superadmin puede cambiar manualmente el plan de un entrenador o cliente específico, incluyendo la opción de otorgarle cualquier plan de forma gratuita (con fecha de expiración opcional).
3. Deja un registro (log) de estos cambios manuales, indicando quién lo autorizó y cuándo.
4. Este módulo debe quedar preparado para conectarse con Stripe en la Fase 15 (el cambio manual siempre debe poder anular temporalmente lo que diga Stripe, para casos de cortesía).

Al terminar, prueba otorgar un plan gratuito a un entrenador de ejemplo y confirma que el cambio se refleja en su cuenta.
```

---

### Fase 14 — Panel de Superadministrador: Alimentación de la IA

**Objetivo:** sistema para que el superadmin "nutra" la IA con conocimiento experto.

```
Seguimos con el Panel de Superadministrador de "App Gym". Ahora construimos la sección de inteligencia artificial.

Contexto: la IA debe ir aprendiendo de contenido experto (documentos, videos, rutinas y dietas de referencia) para mejorar sus generaciones y análisis, considerando las metas actuales del cliente.

Tareas de esta fase:
1. Habilita la extensión pgvector en Supabase y crea una tabla "knowledge_base" para almacenar fragmentos de contenido (texto extraído de documentos o transcripciones de video), su embedding vectorial, y metadatos (tipo: documento, video, rutina, dieta; objetivo o categoría asociada: pérdida de peso, ganancia muscular, rendimiento, etc.).
2. Construye el módulo "Sección IA" en el panel de superadmin: permite subir documentos (PDF, Word) y enlaces de video de YouTube (se guarda el enlace y, si es posible, la transcripción), además de marcar rutinas o dietas existentes como "contenido de referencia de alta calidad".
3. Crea una Edge Function que procese el documento subido, lo divida en fragmentos, genere sus embeddings, y los guarde en "knowledge_base".
4. Modifica las Edge Functions "generate-routine", "generate-diet" y "score-routine" de la Fase 8 para que, antes de generar la respuesta, busquen en "knowledge_base" el contenido más relevante según el objetivo del cliente (búsqueda por similitud vectorial) y lo incluyan como contexto adicional en el prompt enviado a Claude.
5. Muestra en el panel del superadmin un listado del contenido cargado, con la posibilidad de desactivar contenido que ya no se quiera usar.

Al terminar, prueba subir un documento de ejemplo y confirma que aparece disponible como contexto para la generación de rutinas.
```

---

### Fase 15 — Pagos y suscripciones (Stripe, estilo Spotify)

**Objetivo:** gestión de planes de pago fuera de las tiendas de aplicaciones.

```
Seguimos con "App Gym". Ahora implementamos pagos.

Contexto: los pagos se gestionan en un sitio web independiente con Stripe (no dentro de la app, siguiendo el modelo de suscripción externa que usan aplicaciones como Spotify), para evitar la comisión de las tiendas de aplicaciones. Dentro de la app solo se muestra el estado del plan; para actualizar o gestionar la suscripción, el usuario es dirigido a un navegador externo hacia el sitio web.

Tareas de esta fase:
1. En Supabase, crea las tablas necesarias para reflejar el estado de la suscripción de cada entrenador (plan actual, estado: activo/vencido/cancelado, fecha de renovación, id de cliente en Stripe).
2. Crea Edge Functions para: iniciar sesión de checkout de Stripe (llamada desde el sitio web, no desde la app), y recibir webhooks de Stripe que actualicen el estado de la suscripción en la base de datos automáticamente.
3. En la app, en las secciones de Configuración (entrenador) y Perfil (cliente), agrega un botón "Gestionar plan" que abra el navegador del sistema hacia la página correspondiente del sitio web (no un WebView interno, para cumplir con las políticas de Apple y Google sobre enlaces a sistemas de pago externos).
4. Asegura que ningún flujo de pago ocurra dentro de la app, y que no se mencione precio ni se incite a pagar directamente dentro de la interfaz de la app (solo se informa el estado del plan).
5. Documenta en el README los pasos para configurar las llaves de Stripe en el entorno de producción.

Nota importante: revisa las políticas vigentes de Apple (App Store Review Guidelines, sección de pagos y "External Purchase Links") y Google Play (Política de sistema de facturación) antes de publicar, ya que estas reglas cambian con frecuencia y varían según el país. En algunos casos Apple exige que exista también la opción de pago con In-App Purchase si se permite el acceso a contenido de pago dentro de la app.

Al terminar, prueba el flujo completo: pagar en el sitio web de prueba de Stripe, y confirmar que el estado del plan se actualiza automáticamente en la app.
```

---

### Fase 16 — Calidad, accesibilidad y revisión de idioma

**Objetivo:** pulir la aplicación completa antes de publicar.

```
Seguimos con "App Gym". Ya tenemos los tres paneles funcionando de punta a punta. Ahora hacemos una fase de calidad general.

Tareas de esta fase:
1. Revisa toda la aplicación en busca de textos con errores ortográficos, acentos faltantes o incorrectos, y frases que no sean naturales en español latinoamericano. Corrige todo lo que encuentres.
2. Confirma que no exista ningún emoji en ninguna pantalla, mensaje, notificación o correo transaccional; reemplaza cualquier caso encontrado por un ícono del sistema de diseño.
3. Revisa consistencia visual: espaciados, tamaños de fuente, colores, y comportamiento de los componentes en pantallas pequeñas y grandes.
4. Agrega manejo de errores y estados vacíos (por ejemplo: "todavía no tienes rutinas asignadas") en todas las listas y módulos.
5. Revisa accesibilidad básica: contraste de colores, tamaños de texto legibles, etiquetas para lectores de pantalla en botones e íconos principales.
6. Escribe pruebas automatizadas (unitarias y de widgets) para los flujos críticos: login, asignación de rutina, sustitución de alimento, generación con IA, cambio de plan.
7. Revisa el rendimiento de las pantallas con listas largas (clientes, ejercicios, alimentos) y optimiza donde sea necesario (paginación o scroll infinito).

Al terminar, dame un resumen de los problemas encontrados y corregidos.
```

---

### Fase 17 — Publicación en Play Store y App Store

**Objetivo:** preparar y subir la app a ambas tiendas.

```
Seguimos con "App Gym". Última fase: preparar la publicación.

Tareas de esta fase:
1. Genera los íconos de la app y splash screen en todos los tamaños requeridos por iOS y Android.
2. Prepara los textos de la ficha de la tienda (nombre, descripción corta, descripción larga, palabras clave) en español, cuidando ortografía y acentos, sin emojis.
3. Redacta la política de privacidad y los términos de servicio (borrador inicial) considerando que la app maneja datos de salud/nutrición y pagos externos.
4. Configura la firma de la app para Android (keystore) y los certificados/perfiles de aprovisionamiento para iOS.
5. Configura el pipeline de CI/CD (Codemagic o GitHub Actions + Fastlane) para generar builds de producción automáticamente desde la rama principal del repositorio.
6. Prepara las capturas de pantalla requeridas por cada tienda (dimensiones específicas por dispositivo).
7. Completa el cuestionario de privacidad de datos de cada tienda (App Privacy de Apple, Data Safety de Google), reflejando con precisión qué datos se recolectan (salud, nutrición, pagos) y con qué fin.
8. Genera un checklist final de verificación antes de enviar a revisión en ambas tiendas.

Al terminar, dame el checklist final y los siguientes pasos manuales que yo debo hacer (por ejemplo, crear las cuentas de desarrollador si aún no existen).
```

---

## 5. Recomendación de uso de este documento

Se sugiere trabajar una fase a la vez, revisando el resultado antes de continuar con la siguiente. Si en algún punto Claude Code se desvía del alcance de la fase, se puede recordar el contexto pegando nuevamente el párrafo de "Contexto" de esa fase antes de continuar.
