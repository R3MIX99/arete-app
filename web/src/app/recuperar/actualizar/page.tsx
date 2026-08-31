"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AuthBrandIcon } from "@/components/auth/auth-brand-icon";

/**
 * Página a la que llega el enlace del correo de /recuperar. El cliente
 * de Supabase detecta solo el token que trae la URL (hash
 * #access_token=...&type=recovery) y dispara el evento
 * PASSWORD_RECOVERY con una sesión temporal — de ahí sale el permiso
 * para llamar updateUser({ password }), sin necesitar la contraseña
 * anterior. Se escucha ese evento (onAuthStateChange) en vez de solo
 * revisar la sesión al montar, porque el token tarda un instante en
 * procesarse después de que carga la página.
 */
export default function UpdatePasswordPage() {
  const router = useRouter();
  const [ready, setReady] = React.useState(false);
  const [invalidLink, setInvalidLink] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    // Si el enlace ya se procesó antes de que se alcanzara a suscribir
    // el listener de arriba (o si la persona recarga esta página con la
    // sesión de recuperación todavía viva), esto lo cubre.
    async function checkExistingSession() {
      const { data } = await supabase.auth.getSession();
      if (data.session) setReady(true);
    }
    void checkExistingSession();

    // Enlace vencido, ya usado, o alguien llegó directo a esta URL sin
    // pasar por el correo: después de un rato sin sesión de recuperación,
    // se avisa en vez de dejar el formulario ahí sin decir nada.
    const timeout = setTimeout(() => {
      setReady((currentReady) => {
        if (!currentReady) setInvalidLink(true);
        return currentReady;
      });
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("No se pudo actualizar tu contraseña. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    // Se cierra la sesión temporal de recuperación a propósito — que
    // vuelva a entrar con su contraseña nueva desde /login, en vez de
    // quedar dentro sin haber tecleado nunca la contraseña que acaba de
    // poner.
    await supabase.auth.signOut();
    setDone(true);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <AuthBrandIcon />
          <p className="text-sm text-muted-foreground">Pon una contraseña nueva</p>
        </div>

        {done ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="font-medium">Contraseña actualizada</p>
              <p className="text-sm text-muted-foreground">
                Ya puedes iniciar sesión con tu contraseña nueva.
              </p>
              <Button onClick={() => router.replace("/login")} className="mt-2">
                Ir a iniciar sesión
              </Button>
            </CardContent>
          </Card>
        ) : invalidLink ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <p className="text-sm">
                Este enlace ya venció o ya fue usado. Pide uno nuevo desde
                &quot;¿La olvidaste?&quot; en la pantalla de inicio de sesión.
              </p>
              <a href="/recuperar" className="mt-2 text-sm font-medium text-primary hover:underline">
                Pedir enlace nuevo
              </a>
            </CardContent>
          </Card>
        ) : !ready ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Contraseña nueva</CardTitle>
              <CardDescription>Elige una contraseña nueva para tu cuenta.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Contraseña nueva</Label>
                  <PasswordInput
                    id="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirm_password">Confirmar contraseña</Label>
                  <PasswordInput
                    id="confirm_password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu contraseña"
                  />
                </div>

                {error ? (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                ) : null}

                <Button type="submit" disabled={loading} className="mt-1">
                  {loading ? <Loader2 className="animate-spin" /> : null}
                  Guardar contraseña
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
