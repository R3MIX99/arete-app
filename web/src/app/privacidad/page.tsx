import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Política de privacidad — Aretia",
};

/**
 * Aviso de privacidad. Contenido estático, en español, dirigido a
 * usuarios en México (LFPDPPP) — es la base que piden Google Play y App
 * Store para publicar. Antes de lanzamiento formal conviene que un
 * abogado la revise y la formalice como Aviso de Privacidad completo
 * (el resumen de la sección de derechos ARCO ya deja la estructura
 * lista para eso).
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 pb-20">
      <Link
        href="/login"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Política de privacidad</h1>
        <p className="mt-1 text-sm text-muted-foreground">Última actualización: 20 de septiembre de 2026</p>
      </div>

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground">
        <p>
          Esta política explica qué información recopila <strong>Aretia</strong> (la aplicación, operada por{" "}
          <strong>Codeal.ai</strong>), para qué la usamos, con quién la compartimos y qué derechos tienes sobre
          ella. Al crear una cuenta o usar la aplicación, aceptas esta política.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">1. Quiénes somos</h2>
          <p>
            Aretia es operada por Codeal.ai. Puedes contactarnos en cualquier momento en{" "}
            <a href="mailto:equipo@codeal.ai" className="text-primary underline">
              equipo@codeal.ai
            </a>
            .
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">2. Qué información recopilamos</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Datos de cuenta:</strong> nombre, correo, teléfono y contraseña (cifrada, nunca la vemos en
              texto plano). Si inicias sesión con Google, recibimos de Google únicamente tu nombre, tu correo y tu
              foto de perfil; nunca recibimos tu contraseña de Google.
            </li>
            <li>
              <strong>Datos de salud y condición física</strong> (solo clientes): peso, estatura, género, objetivo,
              frecuencia de entrenamiento, y notas de salud que tú decidas escribir.
            </li>
            <li>
              <strong>Actividad en la app:</strong> rutinas, series, repeticiones, peso levantado, planes
              nutricionales, sustituciones de alimentos, y tu historial de progreso.
            </li>
            <li>
              <strong>Fotos de progreso</strong>, si decides subirlas.
            </li>
            <li>
              <strong>Datos de negocio</strong> (solo entrenadores): nombre del negocio, logo, y la relación con
              tus clientes.
            </li>
            <li>
              <strong>Mensajes de soporte</strong> (solo entrenadores): el contenido de tus consultas y
              conversaciones con nuestro equipo de soporte.
            </li>
            <li>
              <strong>Datos técnicos:</strong> tipo de dispositivo, sistema operativo, y registros de uso básicos
              para poder dar soporte y corregir errores.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">3. Para qué usamos tu información</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Operar la aplicación: mostrarte tus rutinas, planes, progreso y los de tus clientes (si eres entrenador).</li>
            <li>
              Generar rutinas, planes nutricionales, y evaluaciones automáticas mediante inteligencia artificial,
              cuando tú o tu entrenador lo solicitan.
            </li>
            <li>Enviarte notificaciones dentro de la app sobre cambios en tu rutina o plan.</li>
            <li>Dar soporte cuando nos contactas, incluido el chat de soporte para entrenadores.</li>
            <li>Mejorar la aplicación y corregir errores.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">4. Con quién compartimos tu información</h2>
          <p>
            <strong>Nunca vendemos tus datos.</strong> Los compartimos únicamente con los proveedores que hacen
            posible el funcionamiento de la app, bajo sus propios acuerdos de confidencialidad:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Supabase (autoalojado en nuestra propia infraestructura)</strong> — aloja nuestra base de
              datos y archivos (fotos de progreso, logos).
            </li>
            <li>
              <strong>Hostinger</strong> — el servidor donde corre la aplicación web.
            </li>
            <li>
              <strong>Anthropic (Claude)</strong> — procesa la información necesaria (objetivo, historial de
              entrenamiento) para generar rutinas y planes nutricionales cuando usas esa función.
            </li>
            <li>
              <strong>Google</strong> — si eliges iniciar sesión con tu cuenta de Google, para verificar tu
              identidad.
            </li>
            <li>
              <strong>YouTube</strong> — los videos de los ejercicios se reproducen desde YouTube, que puede
              recopilar datos técnicos al reproducirlos según su propia política.
            </li>
            <li>
              <strong>Stripe</strong> — procesa los pagos de las suscripciones, que se gestionan únicamente en
              nuestro sitio web y no dentro de la aplicación. Nosotros no almacenamos los datos de tu tarjeta.
            </li>
          </ul>
          <p>
            No usamos publicidad, no incluimos rastreadores de terceros con fines publicitarios y no vendemos ni
            compartimos tus datos con anunciantes.
          </p>
          <p>Si eres cliente, tu entrenador asignado también tiene acceso a tu información de entrenamiento y nutrición — es necesario para que pueda darte seguimiento.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">5. Cuánto tiempo conservamos tu información</h2>
          <p>
            Mientras tu cuenta esté activa. Puedes eliminarla en cualquier momento desde la aplicación, en{" "}
            <strong>Configuración</strong>, o solicitándolo en{" "}
            <Link href="/eliminar-cuenta" className="text-primary underline">
              la página de eliminación de cuenta
            </Link>
            . Al hacerlo, anonimizamos tus datos personales y borramos tus archivos (como fotos de progreso y
            logos). Podemos conservar de forma anónima datos agregados que no te identifican, y la información que
            estemos obligados a conservar por ley.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">6. Tus derechos (ARCO)</h2>
          <p>
            Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al uso de tus datos personales, conforme a
            la Ley Federal de Protección de Datos Personales en Posesión de los Particulares. Para ejercer
            cualquiera de estos derechos, escríbenos a{" "}
            <a href="mailto:equipo@codeal.ai" className="text-primary underline">
              equipo@codeal.ai
            </a>
            .
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">7. Seguridad</h2>
          <p>
            Usamos controles de acceso a nivel de base de datos (cada usuario solo puede ver su propia
            información, o la de sus clientes si es entrenador) y conexiones cifradas (HTTPS) en toda la
            aplicación.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">8. Aviso sobre salud</h2>
          <p>
            Aretia genera y organiza rutinas de entrenamiento y planes de alimentación con fines de
            entrenamiento general. No ofrece diagnósticos ni tratamientos médicos ni sustituye la opinión de un
            profesional de la salud. Si tienes una lesión o una condición médica, consulta a un profesional
            antes de seguir una rutina o un plan de alimentación.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">9. Menores de edad</h2>
          <p>Aretia no está dirigida a menores de 18 años sin la supervisión de un entrenador o tutor responsable de su cuenta.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">10. Cambios a esta política</h2>
          <p>Podemos actualizar esta política ocasionalmente. Si hacemos cambios importantes, te avisaremos dentro de la aplicación.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">11. Contacto</h2>
          <p>
            <a href="mailto:equipo@codeal.ai" className="text-primary underline">
              equipo@codeal.ai
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
