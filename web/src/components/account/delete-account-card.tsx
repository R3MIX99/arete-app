"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { deleteMyAccount } from "@/lib/delete-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CONFIRM_WORD = "ELIMINAR";

/** Tarjeta "Eliminar mi cuenta" — requisito de las tiendas de apps: el
 * usuario debe poder borrar su cuenta desde la propia app. */
export function DeleteAccountCard({
  userId,
  role,
}: {
  userId: string;
  role: "client" | "trainer";
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

  const consequences =
    role === "client"
      ? "Se borrarán de forma permanente tu perfil, tus entrenamientos, tus medidas, tus fotos de progreso y todo tu historial. Tu entrenador dejará de verte en su lista."
      : "Se quitarán tus datos personales (nombre, correo, teléfono, logo) y ya no podrás iniciar sesión. Tus rutinas, programas y planes se conservan para que tus clientes no pierdan su plan, pero aparecerán sin tu nombre.";

  async function handleDelete() {
    setDeleting(true);
    const { error } = await deleteMyAccount(createClient(), userId);
    if (error) {
      setDeleting(false);
      toast.error("No se pudo eliminar la cuenta", { description: error });
      return;
    }
    toast.success("Tu cuenta fue eliminada");
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Eliminar cuenta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{consequences}</p>
          <Button
            type="button"
            variant="outline"
            className="w-fit text-destructive hover:text-destructive"
            onClick={() => {
              setConfirmText("");
              setOpen(true);
            }}
          >
            <Trash2 /> Eliminar mi cuenta
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" /> ¿Eliminar tu cuenta?
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. {consequences}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm_delete">
              Escribe <span className="font-semibold">{CONFIRM_WORD}</span> para confirmar
            </Label>
            <Input
              id="confirm_delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={deleting} onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={confirmText.trim().toUpperCase() !== CONFIRM_WORD || deleting}
              onClick={handleDelete}
            >
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Eliminar definitivamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
