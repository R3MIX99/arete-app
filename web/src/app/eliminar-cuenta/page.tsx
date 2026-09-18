import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Eliminar cuenta — Aretia",
};

/** URL pública de eliminación de cuenta: Google Play exige una página web
 * donde el usuario pueda ver cómo pedir el borrado de su cuenta y de sus
 * datos, aunque ya no tenga la app instalada. */
export default function DeleteAccountInfoPage() {
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
        <h1 className="text-2xl font-bold">Eliminar tu cuenta de Aretia</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Puedes borrar tu cuenta y tus datos cuando quieras.
        </p>
      </div>

      <div className="flex flex-col gap-6 text-sm leading-relaxed">
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Desde la aplicación</h2>
          <ol className="list-decimal pl-5">
            <li>Inicia sesión en Aretia.</li>
            <li>Entra a Configuración (los clientes, desde su perfil en el avatar).</li>
            <li>Elige &ldquo;Eliminar mi cuenta&rdquo; y confirma escribiendo ELIMINAR.</li>
          </ol>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Qué se elimina</h2>
          <ul className="list-disc pl-5">
            <li>
              <strong>Clientes:</strong> se borran de forma permanente tu perfil, entrenamientos, medidas,
              fotos de progreso e historial.
            </li>
            <li>
              <strong>Entrenadores:</strong> se eliminan tus datos personales (nombre, correo, teléfono y
              logo) y se cierra tu acceso. Tus rutinas, programas y planes se conservan sin tu nombre para
              que tus clientes no pierdan su plan.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Si no puedes entrar a tu cuenta</h2>
          <p>
            Envíanos la solicitud desde el{" "}
            <Link href="/soporte?tema=eliminar-cuenta" className="text-primary underline">
              formulario de soporte
            </Link>{" "}
            usando el correo con el que te registraste. Procesamos las solicitudes en un máximo de 30 días.
          </p>
          <p className="text-muted-foreground">
            Si administras un gimnasio, escríbenos primero para transferir el gimnasio antes de cerrar tu
            cuenta.
          </p>
        </section>
      </div>
    </div>
  );
}
