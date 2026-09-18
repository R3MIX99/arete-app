"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { supportCategoryLabels } from "@/lib/types/support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CATEGORIES = Object.entries(supportCategoryLabels).filter(
  ([value]) => value !== "eliminar_cuenta",
);

export function NewChatDialog({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: { id: string; full_name: string; email: string };
}) {
  const router = useRouter();
  const [category, setCategory] = React.useState("otro");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    const { data, error } = await createClient()
      .from("support_tickets")
      .insert({
        user_id: profile.id,
        name: profile.full_name,
        email: profile.email,
        category,
        subject: subject.trim(),
        message: message.trim(),
      })
      .select("id")
      .single();
    setSending(false);
    if (error || !data) {
      toast.error("No se pudo iniciar el chat", { description: error?.message });
      return;
    }
    setSubject("");
    setMessage("");
    onOpenChange(false);
    router.push(`/entrenador/soporte/${data.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !sending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo chat con soporte</DialogTitle>
          <DialogDescription>
            Cuéntanos en qué te ayudamos. Verás la respuesta aquí mismo, en tiempo real.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chat_category">Tema</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="chat_category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chat_subject">Asunto</Label>
            <Input
              id="chat_subject"
              required
              maxLength={160}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="chat_message">Mensaje</Label>
            <Textarea
              id="chat_message"
              required
              rows={5}
              maxLength={4000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={sending} className="w-fit">
            {sending ? <Loader2 className="animate-spin" /> : <MessageSquarePlus />}
            Iniciar chat
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
