"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { isAlreadyRegisteredSignUp } from "@/lib/auth-errors";
import { gymRoleLabels, type GymRole } from "@/lib/types/gyms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AuthBrandIcon } from "@/components/auth/auth-brand-icon";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

interface GymInvitationPreview {
  id: string;
  email: string;
  invited_role: GymRole;
  status: string;
  gym_name: string;
}

/**
 * Página pública del enlace de invitación de EMPLEADO
 * (`/registro/equipo/[token]`) — mismo patrón que la invitación de
 * cliente (InvitationAcceptForm), adaptado a redeem_gym_invitation():
 * el correo con el que se autentica tiene que ser exactamente el de la
 * invitación (decisión #3), y al aceptar el perfil pasa a role='trainer'
 * (si todavía era 'client') más gym_id/gym_members con el rol invitado.
 */
export function GymInvitationAcceptForm({
  token,
  invitation,
}: {
  token: string;
  invitation: GymInvitationPreview;
}) {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = React.useState(true);
  const [hasSession, setHasSession] = React.useState(false);
  const [sessionEmail, setSessionEmail] = React.useState<string | null>(null);
  const [fullName, setFullName] = React.useState("");
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
      setSessionEmail(data.user?.email ?? null);
      setCheckingSession(false);
    }
    void load();
  }, []);

  const alreadyUsed = invitation.status !== "pending";
  const roleLabel = gymRoleLabels[invitation.invited_role];

  async function redeem() {
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("redeem_gym_invitation", {
      p_token: token,
    });
    if (rpcError) {
      setError(rpcError.message || "No se pudo aceptar la invitación.");
      setLoading(false);
      return;
    }
    // Ya quedó dentro del equipo — si es la primera vez que entra como
    // entrenador todavía le falta el onboarding corto (nombre, etc.).
    const destination = data?.onboarding_completed_at ? "/entrenador" : "/onboarding/entrenador";
    router.replace(destination);
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
        data: { role: "trainer", full_name: fullName },
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
      // El proyecto pide confirmar el correo antes de dar sesión — no se
      // puede canjear la invitación todavía (redeem_gym_invitation exige
      // auth.uid()). Se le pide confirmar y volver, la cuenta ya se creó.
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
          <AuthBrandIcon />
          <p className="text-sm text-muted-foreground">Invitación de equipo de {invitation.gym_name}</p>
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
                  y esto se abre solo, ya con tu cuenta lista para terminar de unirte a{" "}
                  {invitation.gym_name}.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : alreadyUsed ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <p className="text-sm">
                Esta invitación ya fue usada, revocada o venció. Si crees que es un error, pídele a
                tu administrador un enlace nuevo.
              </p>
            </CardContent>
          </Card>
        ) : checkingSession ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : hasSession && sessionEmail?.toLowerCase() !== invitation.email.toLowerCase() ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Esta invitación es para <strong className="text-foreground">{invitation.email}</strong>,
                pero entraste con <strong className="text-foreground">{sessionEmail}</strong>. Cierra
                sesión y abre este enlace de nuevo con la cuenta correcta.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={async () => {
                  await createClient().auth.signOut();
                  router.refresh();
                }}
              >
                Cerrar sesión
              </Button>
            </CardContent>
          </Card>
        ) : hasSession ? (
          <Card>
            <CardHeader>
              <CardTitle>Aceptar invitación</CardTitle>
              <CardDescription>
                Vas a unirte a {invitation.gym_name} como {roleLabel.toLowerCase()}.
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
                {invitation.gym_name} te invitó a Aretia como {roleLabel.toLowerCase()}.
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

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">o</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <GoogleSignInButton next={`/registro/equipo/${token}`} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
