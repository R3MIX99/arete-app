"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { supportCategoryLabels } from "@/lib/types/support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SupportForm({
  initialName = "",
  initialEmail = "",
  userId = null,
  initialCategory = "otro",
}: {
  initialName?: string;
  initialEmail?: string;
  userId?: string | null;
  initialCategory?: string;
}) {
  const [name, setName] = React.useState(initialName);
  const [email, setEmail] = React.useState(initialEmail);
  const [category, setCategory] = React.useState(
    initialCategory in supportCategoryLabels ? initialCategory : "otro",
  );
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  // Campo trampa: las personas no lo ven ni lo llenan, los bots sí.
  const [website, setWebsite] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (website) {
      setSent(true);
      return;
    }
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.from("support_tickets").insert({
      user_id: userId,
      name: name.trim(),
      email: email.trim(),
      category,
      subject: subject.trim(),
      message: message.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("No se pudo enviar tu mensaje", { description: error.message });
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border p-8 text-center">
        <CheckCircle2 className="size-8 text-primary" />
        <p className="font-semibold">Recibimos tu mensaje</p>
        <p className="text-sm text-muted-foreground">
          Te responderemos por correo a {email || "tu dirección"} lo antes posible.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="support_name">Nombre</Label>
          <Input
            id="support_name"
            required
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="support_email">Correo</Label>
          <Input
            id="support_email"
            type="email"
            required
            maxLength={200}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="support_category">Tema</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="support_category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(supportCategoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="support_subject">Asunto</Label>
        <Input
          id="support_subject"
          required
          maxLength={160}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="support_message">Mensaje</Label>
        <Textarea
          id="support_message"
          required
          rows={6}
          maxLength={4000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Cuéntanos qué pasó o en qué te podemos ayudar."
        />
      </div>

      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />

      <Button type="submit" disabled={sending} className="w-fit">
        {sending ? <Loader2 className="animate-spin" /> : <Send />}
        Enviar mensaje
      </Button>
    </form>
  );
}
