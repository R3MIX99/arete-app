export interface HelpArticle {
  id: string;
  kind: "guia" | "faq";
  topic: string;
  title: string;
  /** Pasos (guías) o respuesta corta (preguntas frecuentes). */
  steps?: string[];
  answer?: string;
}

/** Contenido del centro de ayuda del entrenador. Es texto estático: se
 * busca en el navegador, sin base de datos. */
export const helpArticles: HelpArticle[] = [
  {
    id: "g-agregar-cliente",
    kind: "guia",
    topic: "Primeros pasos",
    title: "Cómo invitar a un cliente",
    steps: [
      "Entra a Clientes y usa el botón de nuevo cliente.",
      "Escribe su nombre y correo; puedes agregar su objetivo y notas de salud.",
      "Se genera una invitación de un solo uso: compártela con tu cliente.",
      "Cuando la acepte, aparecerá en tu lista y podrás asignarle un programa y un plan.",
    ],
  },
  {
    id: "g-crear-rutina",
    kind: "guia",
    topic: "Rutinas y programas",
    title: "Cómo crear una rutina",
    steps: [
      "Ve a Rutinas y crea una nueva.",
      "Ponle nombre, nivel y objetivo, y agrega ejercicios de tu biblioteca.",
      "Configura las series de cada ejercicio: repeticiones, descanso, o minutos y nivel si es cardio.",
      "Guarda. Ya puedes usarla dentro de un programa o asignarla a un cliente.",
    ],
  },
  {
    id: "g-programa",
    kind: "guia",
    topic: "Rutinas y programas",
    title: "Cómo armar un programa de varias semanas",
    steps: [
      "Entra a Programas y crea uno nuevo; empieza con una semana.",
      "En cada día elige la rutina que le toca, o déjalo como descanso.",
      "Usa Clonar semana para repetir una semana y ajustarla.",
      "Asigna el programa a tus clientes desde el propio programa.",
    ],
  },
  {
    id: "g-importar-ejercicios",
    kind: "guia",
    topic: "Ejercicios",
    title: "Cómo importar ejercicios desde Excel",
    steps: [
      "En la Biblioteca de Ejercicios elige Importar desde Excel.",
      "Sube un archivo con las columnas Nombre, Grupo muscular, Equipo, Descripción y Enlace.",
      "Si un ejercicio trabaja varios grupos o equipos, sepáralos con el signo +.",
      "Revisa la lista, desmarca lo que no quieras y confirma la importación.",
    ],
  },
  {
    id: "g-plan-nutricional",
    kind: "guia",
    topic: "Nutrición",
    title: "Cómo crear y asignar un plan nutricional",
    steps: [
      "Ve a Planes Nutricionales y crea uno nuevo.",
      "Agrega bloques de comida y llénalos con platillos o alimentos.",
      "Guarda y usa Asignar para dárselo a tus clientes.",
    ],
  },
  {
    id: "f-varios-grupos",
    kind: "faq",
    topic: "Ejercicios",
    title: "¿Un ejercicio puede trabajar varios grupos musculares?",
    answer:
      "Sí. Al crear o editar un ejercicio puedes elegir uno o varios grupos musculares y uno o varios equipos.",
  },
  {
    id: "f-editar-rutina-asignada",
    kind: "faq",
    topic: "Rutinas y programas",
    title: "¿Qué pasa con mis clientes si edito una rutina?",
    answer:
      "Los cambios se ven en las asignaciones futuras. El historial de lo que tu cliente ya entrenó se conserva tal como quedó ese día.",
  },
  {
    id: "f-compartir-equipo",
    kind: "faq",
    topic: "Equipo",
    title: "Soy parte de un gimnasio, ¿mis rutinas las ve todo el equipo?",
    answer:
      "Solo si tú las compartes. Lo que creas es privado por defecto; con el interruptor Compartir con el equipo lo pueden ver y asignar tus compañeros, pero solo tú puedes editarlo. El administrador del gimnasio ve todo.",
  },
  {
    id: "f-entrenador-nutriologo",
    kind: "faq",
    topic: "Equipo",
    title: "¿Un cliente puede tener entrenador y nutriólogo a la vez?",
    answer:
      "Sí. Cada uno maneja lo suyo: el entrenador las rutinas y el nutriólogo la alimentación, sin poder tocar el área del otro.",
  },
  {
    id: "f-plan-limite",
    kind: "faq",
    topic: "Cuenta y planes",
    title: "¿Cómo cambio de plan o aumento mi límite de clientes?",
    answer:
      "Abre un chat con soporte y te ayudamos con tu plan y tu límite de clientes.",
  },
  {
    id: "f-recuperar-password",
    kind: "faq",
    topic: "Cuenta y planes",
    title: "Olvidé mi contraseña",
    answer:
      "En la pantalla de inicio de sesión usa Olvidé mi contraseña y sigue el enlace que llega a tu correo. Si entras con Google, usa ese botón.",
  },
  {
    id: "f-eliminar-cuenta",
    kind: "faq",
    topic: "Cuenta y planes",
    title: "¿Cómo elimino mi cuenta?",
    answer:
      "En Configuración, al final, está Eliminar mi cuenta. Se quitan tus datos personales; tus rutinas y planes se conservan sin tu nombre para que tus clientes no pierdan su plan. Si administras un gimnasio, escríbenos primero.",
  },
];

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function searchHelpArticles(query: string): HelpArticle[] {
  const q = normalize(query.trim());
  if (!q) return helpArticles;
  return helpArticles.filter((a) =>
    normalize([a.title, a.topic, a.answer ?? "", ...(a.steps ?? [])].join(" ")).includes(q),
  );
}
