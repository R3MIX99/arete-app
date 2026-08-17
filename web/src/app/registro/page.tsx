"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { isAlreadyRegisteredSignUp } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

/**
 * Auto-registro. Solo para ENTRENADORES: un cliente nunca crea su
 * cuenta libremente, siempre llega por el enlace de invitación de su
 * entrenador (/registro/invitacion/[token]), que ya trae su correo
 * fijado y lo deja asignado automáticamente. Esta pantalla existía como
 * enlace desde /login pero la ruta nunca se había construido — daba 404.
 */
export default function TrainerSignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNeedsConfirmation(false);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: "trainer", full_name: fullName },
      },
    });

    if (isAlreadyRegisteredSignUp(signUpError, data?.user)) {
      setError("Ya existe una cuenta con este correo. Inicia sesión en vez de registrarte.");
      setLoading(false);
      return;
    }

    if (signUpError || !data.user) {
      setError("No se pudo crear tu cuenta. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    if (!data.session) {
      // El proyecto pide confirmar el correo antes de dar sesión — sin
      // sesión no se puede entrar al onboarding todavía.
      setNeedsConfirmation(true);
      setLoading(false);
      return;
    }

    router.replace("/onboarding/entrenador");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Dumbbell className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Areté</h1>
            <p className="text-sm text-muted-foreground">Crea tu cuenta de entrenador</p>
          </div>
        </div>

        {needsConfirmation ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="font-medium">Revisa tu correo</p>
              <p className="text-sm text-muted-foreground">
                Te mandamos un enlace de confirmación a {email}. Confírmalo y después inicia
                sesión — ahí completas el resto de tu perfil.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Registro de entrenador</CardTitle>
              <CardDescription>
                Después de esto te pedimos un par de datos más para dejar tu cuenta lista.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="full_name">Nombre completo</Label>
                  <Input
                    id="full_name"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Correo</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}

                <Button type="submit" disabled={loading} className="mt-1">
                  {loading ? <Loader2 className="animate-spin" /> : null}
                  Crear cuenta
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Tu entrenador te invitó como cliente? Pídele el enlace de invitación — ahí se
          registra tu cuenta.
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="font-medium text-primary hover:underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
