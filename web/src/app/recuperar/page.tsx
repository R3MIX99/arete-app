"use client";

import * as React from "react";
import { Loader2, MailCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AuthBrandIcon } from "@/components/auth/auth-brand-icon";

/**
 * "¿Olvidaste tu contraseña?" — le manda a la persona (entrenador o
 * cliente) un correo con un enlace de un solo uso a /recuperar/actualizar,
 * donde pone su contraseña nueva. No requiere dominio propio: usa el
 * mismo dominio en el que ya está corriendo la app (window.location.origin),
 * igual que el resto de los correos de la app (confirmación de registro,
 * invitación de cliente).
 *
 * El mensaje de éxito es el mismo exista o no una cuenta con ese correo
 * — así no se puede usar este formulario para averiguar qué correos
 * están registrados.
 */
export default function RecoverPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar/actualizar`,
    });
    setLoading(false);

    if (resetError) {
      setError("No se pudo enviar el correo. Intenta de nuevo en unos minutos.");
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <AuthBrandIcon />
          <p className="text-sm text-muted-foreground">Recupera el acceso a tu cuenta</p>
        </div>

        {sent ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/12 text-primary">
                <MailCheck className="size-6" />
              </div>
              <div>
                <p className="font-medium">Revisa tu correo</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Si {email} tiene una cuenta, te mandamos un enlace para poner una contraseña
                  nueva. Puede tardar unos minutos — revisa también spam.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>¿Olvidaste tu contraseña?</CardTitle>
              <CardDescription>
                Escribe el correo de tu cuenta y te mandamos un enlace para ponerle una nueva.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Correo</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                  />
                </div>

                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}

                <Button type="submit" disabled={loading} className="mt-1">
                  {loading ? <Loader2 className="animate-spin" /> : null}
                  Mandar enlace
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          ¿Ya te acordaste?{" "}
          <a href="/login" className="font-medium text-primary hover:underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  );
}
