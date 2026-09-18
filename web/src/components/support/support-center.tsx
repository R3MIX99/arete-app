"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  ChevronDown,
  HelpCircle,
  MessageSquarePlus,
  MessagesSquare,
  Search,
} from "lucide-react";

import { formatDateTime } from "@/lib/format";
import { helpArticles, searchHelpArticles, type HelpArticle } from "@/lib/support-content";
import {
  supportCategoryLabels,
  supportStatusLabels,
  type SupportStatus,
  type SupportTicket,
} from "@/lib/types/support";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NewChatDialog } from "@/components/support/new-chat-dialog";

const statusVariant: Record<SupportStatus, "default" | "secondary" | "outline"> = {
  open: "default",
  in_progress: "secondary",
  resolved: "outline",
};

function ArticleItem({ article }: { article: HelpArticle }) {
  return (
    <details className="group rounded-lg border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium">
        <span>{article.title}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t px-4 py-3 text-sm text-muted-foreground">
        {article.steps ? (
          <ol className="list-decimal space-y-1 pl-5">
            {article.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        ) : (
          <p>{article.answer}</p>
        )}
      </div>
    </details>
  );
}

function SearchBox({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar en guías y preguntas frecuentes…"
        className="pl-9"
      />
    </div>
  );
}

/** Centro de ayuda del entrenador: sin conversaciones se ve como un
 * buscador con guías y preguntas frecuentes; con conversaciones, pasa a la
 * lista de sus chats con las preguntas frecuentes al lado. */
export function SupportCenter({
  tickets,
  profile,
}: {
  tickets: SupportTicket[];
  profile: { id: string; full_name: string; email: string };
}) {
  const [query, setQuery] = React.useState("");
  const [section, setSection] = React.useState<"all" | "guia" | "faq">("all");
  const [chatOpen, setChatOpen] = React.useState(false);

  const results = React.useMemo(
    () => searchHelpArticles(query).filter((a) => section === "all" || a.kind === section),
    [query, section],
  );
  const guides = results.filter((a) => a.kind === "guia");
  const faqs = results.filter((a) => a.kind === "faq");
  const searching = query.trim().length > 0;

  const chatButton = (
    <Button onClick={() => setChatOpen(true)}>
      <MessageSquarePlus /> {tickets.length > 0 ? "Nuevo chat" : "Iniciar chat"}
    </Button>
  );

  const dialog = <NewChatDialog open={chatOpen} onOpenChange={setChatOpen} profile={profile} />;

  if (tickets.length > 0) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 pb-24 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Soporte</h1>
            <p className="text-sm text-muted-foreground">
              Tus conversaciones con el equipo de Aretia.
            </p>
          </div>
          {chatButton}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Mis conversaciones</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground uppercase">
                    <th className="px-2 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">Asunto</th>
                    <th className="px-2 py-2 font-medium">Última actividad</th>
                    <th className="px-2 py-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className="border-b last:border-b-0 hover:bg-foreground/[0.02]">
                      <td className="px-2 py-3 text-muted-foreground tabular-nums">
                        {t.ticket_number}
                      </td>
                      <td className="px-2 py-3">
                        <Link href={`/entrenador/soporte/${t.id}`} className="block min-w-0">
                          <span className="flex items-center gap-2 font-medium">
                            <span className="truncate">{t.subject}</span>
                            {t.trainer_unread > 0 ? (
                              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
                                {t.trainer_unread}
                              </span>
                            ) : null}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {supportCategoryLabels[t.category]}
                          </span>
                        </Link>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap text-muted-foreground">
                        {formatDateTime(t.last_message_at)}
                      </td>
                      <td className="px-2 py-3">
                        <Badge variant={statusVariant[t.status]}>
                          {supportStatusLabels[t.status]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Preguntas frecuentes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <SearchBox value={query} onChange={setQuery} />
              {results.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No encontramos nada. Inicia un chat y te ayudamos.
                </p>
              ) : (
                <div className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto">
                  {results.map((a) => (
                    <ArticleItem key={a.id} article={a} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        {dialog}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 p-4 pb-24 md:p-8">
      <div className="flex flex-col items-center gap-5 pt-4 text-center">
        <h1 className="text-3xl font-bold">¿Cómo podemos ayudarte?</h1>
        <SearchBox value={query} onChange={setQuery} className="w-full max-w-xl" />
      </div>

      {!searching ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setSection(section === "guia" ? "all" : "guia")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-6 text-center transition-colors hover:border-primary/40",
              section === "guia" && "border-primary bg-primary/5",
            )}
          >
            <BookOpen className="size-8 text-primary" />
            <span className="font-semibold">Guías</span>
            <span className="text-sm text-muted-foreground">
              Paso a paso ({helpArticles.filter((a) => a.kind === "guia").length})
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSection(section === "faq" ? "all" : "faq")}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-6 text-center transition-colors hover:border-primary/40",
              section === "faq" && "border-primary bg-primary/5",
            )}
          >
            <HelpCircle className="size-8 text-primary" />
            <span className="font-semibold">Preguntas frecuentes</span>
            <span className="text-sm text-muted-foreground">
              Respuestas rápidas ({helpArticles.filter((a) => a.kind === "faq").length})
            </span>
          </button>
          <div className="flex flex-col items-center gap-2 rounded-xl border p-6 text-center">
            <MessagesSquare className="size-8 text-primary" />
            <span className="font-semibold">Chat con soporte</span>
            <span className="text-sm text-muted-foreground">Habla con nuestro equipo</span>
            <Button size="sm" className="mt-1" onClick={() => setChatOpen(true)}>
              Iniciar chat
            </Button>
          </div>
        </div>
      ) : null}

      {results.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">No encontramos nada con esa búsqueda.</p>
          {chatButton}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {guides.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Guías</h2>
              {guides.map((a) => (
                <ArticleItem key={a.id} article={a} />
              ))}
            </section>
          ) : null}
          {faqs.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">Preguntas frecuentes</h2>
              {faqs.map((a) => (
                <ArticleItem key={a.id} article={a} />
              ))}
            </section>
          ) : null}
        </div>
      )}
      {dialog}
    </div>
  );
}
