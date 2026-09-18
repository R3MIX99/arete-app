import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { SupportForm } from "@/components/support/support-form";

export const metadata = {
  title: "Soporte — Aretia",
};

const FAQ = [
  {
    q: "No puedo iniciar sesión",
    a: "Usa \"Olvidé mi contraseña\" en la pantalla de inicio de sesión. Si tu cuenta es de Google, entra con el botón de Google. Si sigue sin funcionar, escríbenos con el formulario.",
  },
  {
    q: "No me llegó el correo de invitación",
    a: "Revisa la carpeta de spam. Pídele a tu entrenador que te reenvíe la invitación; el enlace es de un solo uso.",
  },
  {
    q: "¿Cómo elimino mi cuenta?",
    a: "Desde la app: Configuración, Eliminar cuenta. También puedes pedirlo aquí abajo eligiendo el tema \"Eliminar mi cuenta\".",
  },
];

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ tema?: string }>;
}) {
  const { tema } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { full_name: string; email: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();
    profile = data;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 pb-20">
      <Link
        href={user ? "/" : "/login"}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        Volver
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Soporte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuéntanos qué necesitas y te respondemos por correo.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Preguntas frecuentes</h2>
        <div className="flex flex-col gap-3">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-lg border p-4">
              <p className="text-sm font-medium">{item.q}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Escríbenos</h2>
        <SupportForm
          initialName={profile?.full_name ?? ""}
          initialEmail={profile?.email ?? ""}
          userId={user?.id ?? null}
          initialCategory={tema === "eliminar-cuenta" ? "eliminar_cuenta" : "otro"}
        />
      </section>
    </div>
  );
}
