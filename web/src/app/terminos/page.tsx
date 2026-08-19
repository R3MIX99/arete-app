import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Términos de servicio — Aretia",
};

/** Términos de servicio. Contenido estático, base para publicar en
 * Google Play / App Store — conviene revisión legal antes del
 * lanzamiento formal, sobre todo la sección de suscripciones en cuanto
 * se defina el modelo de cobro real. */
export default function TermsPage() {
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
        <h1 className="text-2xl font-bold">Términos de servicio</h1>
        <p className="mt-1 text-sm text-muted-foreground">Última actualización: 18 de agosto de 2026</p>
      </div>

      <div className="flex flex-col gap-6 text-sm leading-relaxed text-foreground">
        <p>
          Estos términos rigen el uso de <strong>Aretia</strong>, operada por <strong>Codeal.ai</strong>. Al
          crear una cuenta aceptas estos términos junto con nuestra{" "}
          <Link href="/privacidad" className="text-primary underline">
            política de privacidad
          </Link>
          .
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">1. Qué es Aretia</h2>
          <p>
            Aretia es una plataforma que permite a entrenadores gestionar a sus clientes — rutinas, programas,
            planes nutricionales, calendario y seguimiento de progreso — y a los clientes seguir su entrenamiento
            y nutrición asignados.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">2. Cuentas</h2>
          <p>
            Los entrenadores se registran directamente. Los clientes se unen mediante un enlace de invitación que
            les envía su entrenador — no pueden crear una cuenta libremente sin invitación. Eres responsable de
            mantener segura tu contraseña y de toda la actividad que ocurra en tu cuenta.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">3. No es consejo médico</h2>
          <p>
            <strong>
              Aretia no reemplaza el consejo, diagnóstico o tratamiento de un médico, nutriólogo o profesional de
              la salud.
            </strong>{" "}
            Las rutinas y planes nutricionales — generados por un entrenador humano o con ayuda de inteligencia
            artificial — son sugerencias de entrenamiento y alimentación, no indicaciones médicas. Consulta a un
            profesional de la salud antes de iniciar cualquier programa de ejercicio o alimentación, especialmente
            si tienes alguna condición médica preexistente.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">4. Contenido generado con inteligencia artificial</h2>
          <p>
            Algunas rutinas, planes nutricionales y evaluaciones pueden generarse con ayuda de modelos de
            inteligencia artificial, a solicitud del entrenador o del cliente. Este contenido es una sugerencia de
            partida — el entrenador es responsable de revisarlo y ajustarlo antes de que el cliente lo siga.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">5. Suscripciones y pagos</h2>
          <p>
            Algunas funciones de Aretia pueden requerir una suscripción de pago. Los precios, ciclos de cobro y
            condiciones de cancelación se muestran antes de confirmar cualquier suscripción. Los pagos realizados
            a través de las tiendas de aplicaciones (Google Play / App Store) se rigen también por las políticas
            de facturación de esas plataformas.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">6. Uso aceptable</h2>
          <p>Te comprometes a no usar Aretia para: subir contenido ilegal, ofensivo o que viole los derechos de terceros; intentar acceder a cuentas o datos que no te pertenecen; o interferir con el funcionamiento normal de la plataforma.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">7. Propiedad del contenido</h2>
          <p>
            Tú conservas los derechos sobre el contenido que subes (rutinas, planes, notas, fotos de progreso).
            Nos das permiso para almacenarlo y mostrarlo dentro de la aplicación únicamente para prestarte el
            servicio.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">8. Cancelación</h2>
          <p>Puedes solicitar la eliminación de tu cuenta en cualquier momento desde Configuración, o escribiéndonos. Nos reservamos el derecho de suspender cuentas que violen estos términos.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">9. Limitación de responsabilidad</h2>
          <p>
            Aretia se ofrece &quot;tal cual&quot;. No garantizamos que la aplicación esté libre de errores en todo momento.
            En la medida permitida por la ley, no somos responsables por lesiones, daños o resultados derivados de
            seguir una rutina o plan nutricional generado en la plataforma.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">10. Cambios a estos términos</h2>
          <p>Podemos actualizar estos términos ocasionalmente. Si hacemos cambios importantes, te avisaremos dentro de la aplicación.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">11. Ley aplicable</h2>
          <p>Estos términos se rigen por las leyes de los Estados Unidos Mexicanos.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">12. Contacto</h2>
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
