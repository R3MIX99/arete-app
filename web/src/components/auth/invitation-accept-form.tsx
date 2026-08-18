"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { isAlreadyRegisteredSignUp } from "@/lib/auth-errors";
import { goalLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface InvitationPreview {
  id: string;
  email: string;
  full_name: string | null;
  goal: string | null;
  status: string;
  trainer_name: string;
  business_name: string | null;
}

/**
 * Página pública a la que llega el cliente al abrir el enlace de
 * invitación (`/registro/invitacion/[token]`). Si ya tiene sesión de
 * cliente, solo confirma; si no, crea la cuenta y de inmediato canjea
 * el token vía la función `redeem_client_invitation` (ya existía en la
 * base de datos, pero esta pantalla nunca se había construido en el
 * panel Next.js — antes el enlace no llevaba a ningún lado).
 */
export function InvitationAcceptForm({
  token,
  invitation,
}: {
  token: string;
  invitation: InvitationPreview;
}) {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = React.useState(true);
  const [hasSession, setHasSession] = React.useState(false);
  const [fullName, setFullName] = React.useState(invitation.full_name ?? "");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setHasSession(Boolean(data.user));
      setCheckingSession(false);
    }
    void load();
  }, []);

  const brandName = invitation.business_name || invitation.trainer_name;
  const alreadyUsed = invitation.status !== "pending";

  async function redeem() {
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("redeem_client_invitation", {
      p_token: token,
    });
    if (rpcError) {
      setError(rpcError.message || "No se pudo aceptar la invitación.");
      setLoading(false);
      return;
    }
    // Ya quedó asignado a su entrenador — le faltan género, estatura y
    // frecuencia de entrenamiento antes de entrar a su panel.
    router.replace("/onboarding/cliente");
    router.refresh();
  }

  async function handleAcceptWithSession() {
    setLoading(true);
    setError(null);
    await redeem();
  }

  async function handleSignUpAndAccept(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: invitation.email,
      password,
      options: {
        data: { role: "client", full_name: fullName },
        emailRedirectTo: window.location.href,
      },
    });

    if (isAlreadyRegisteredSignUp(signUpError, signUpData?.user)) {
      setError("Ya existe una cuenta con este correo. Inicia sesión y vuelve a abrir este enlace.");
      setLoading(false);
      return;
    }

    if (signUpError) {
      setError("No se pudo crear tu cuenta. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    if (!signUpData.session) {
      // El proyecto pide confirmar el correo antes de dar sesión — no
      // podemos canjear la invitación todavía (redeem_client_invitation
      // exige auth.uid()). Se le pide confirmar y volver — pantalla
      // aparte, no un error: la cuenta sí se creó bien.
      setLoading(false);
      setNeedsConfirmation(true);
      return;
    }

    await redeem();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aretia-logo.png" alt="Aretia" className="h-16 w-auto" />
          <p className="text-sm text-muted-foreground">Invitación de {brandName}</p>
        </div>

        {needsConfirmation ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/12 text-primary">
                <MailCheck className="size-6" />
              </div>
              <div>
                <p className="font-medium">Revisa tu correo</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Te mandamos un enlace de confirmación a {invitation.email}. Ábrelo desde tu correo
                  y esto se abre solo, ya con tu cuenta lista para terminar de unirte a {brandName}.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : alreadyUsed ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <p className="text-sm">
                Esta invitación ya fue usada o fue cancelada. Si crees que es un error,
                pídele a tu entrenador un enlace nuevo.
              </p>
            </CardContent>
          </Card>
        ) : checkingSession ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : hasSession ? (
          <Card>
            <CardHeader>
              <CardTitle>Aceptar invitación</CardTitle>
              <CardDescription>
                Vas a unirte como cliente de {brandName}
                {invitation.goal ? ` (objetivo: ${goalLabel(invitation.goal)})` : ""}.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button onClick={handleAcceptWithSession} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : null}
                Aceptar invitación
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Crea tu cuenta</CardTitle>
              <CardDescription>
                {brandName} te invitó a Aretia
                {invitation.goal ? ` — objetivo: ${goalLabel(invitation.goal)}` : ""}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUpAndAccept} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Correo</Label>
                  <Input id="email" value={invitation.email} disabled />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="full_name">Nombre completo</Label>
                  <Input
                    id="full_name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">Contraseña</Label>
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
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : null}
                  Crear cuenta y unirme
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
