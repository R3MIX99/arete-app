import Link from "next/link";
import { redirect } from "next/navigation";
import { Dumbbell, Apple, TrendingUp, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AuthBrandIcon } from "@/components/auth/auth-brand-icon";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Dumbbell,
    title: "Rutinas de entrenamiento",
    description:
      "Arma programas por semanas, ejercicio por ejercicio y serie por serie, y asígnalos a tus clientes.",
  },
  {
    icon: Apple,
    title: "Planes de nutrición",
    description:
      "Diseña planes de alimentación reutilizables con sustituciones automáticas por categoría de alimento.",
  },
  {
    icon: TrendingUp,
    title: "Seguimiento de progreso",
    description: "Revisa asistencia, peso levantado y evolución de cada cliente en un solo lugar.",
  },
  {
    icon: Users,
    title: "Apoyo de inteligencia artificial",
    description: "Genera un primer borrador de rutina o plan nutricional y ajústalo a tu criterio.",
  },
];

/**
 * Landing pública. Antes esta ruta redirigía directo a /login sin
 * mostrar nada — eso hacía que, para cualquier visitante sin sesión
 * (incluido el verificador de la pantalla de consentimiento de Google
 * OAuth), la "página principal" de Aretia fuera un formulario vacío
 * sin explicar qué es la app. Con sesión, el comportamiento no
 * cambia: se sigue redirigiendo directo a su panel.
 */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "client") redirect("/cliente");
    if (profile?.role === "superadmin") redirect("/superadmin");
    redirect("/entrenador");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2.5">
          <AuthBrandIcon className="h-8 w-auto" />
          <span className="font-medium">Aretia</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/registro">Registrarme</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 pb-20 pt-10 sm:px-10">
        <div className="flex max-w-2xl flex-col items-center gap-5 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            La plataforma para entrenadores y gimnasios
          </h1>
          <p className="max-w-xl text-muted-foreground">
            Aretia junta rutinas de entrenamiento, planes de nutrición y seguimiento de progreso en un
            solo lugar, para que cada entrenador pueda darle a sus clientes un servicio más completo sin
            duplicar trabajo en hojas de cálculo o chats sueltos.
          </p>
          <div className="mt-2 flex gap-3">
            <Button asChild size="lg">
              <Link href="/registro">Crear cuenta de entrenador</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Ya tengo cuenta</Link>
            </Button>
          </div>
        </div>

        <div className="mt-16 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="glass-card flex flex-col gap-2 rounded-xl p-5 text-left"
            >
              <feature.icon className="size-5 text-primary" />
              <p className="font-medium">{feature.title}</p>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        <p className="mt-16 max-w-xl text-center text-sm text-muted-foreground">
          Los clientes no se registran por su cuenta: entran mediante el enlace de invitación que les
          manda su entrenador, ya con su rutina y su plan asignados.
        </p>
      </main>

      <footer className="flex flex-col items-center gap-2 px-6 pb-8 text-center text-xs text-muted-foreground">
        <div className="flex gap-4">
          <Link href="/terminos" className="underline hover:text-foreground">
            Términos de servicio
          </Link>
          <Link href="/privacidad" className="underline hover:text-foreground">
            Política de privacidad
          </Link>
          <Link href="/soporte" className="underline hover:text-foreground">
            Soporte
          </Link>
        </div>
        <p>Aretia, operada por Codeal.ai.</p>
      </footer>
    </div>
  );
}
