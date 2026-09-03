"use client";

import * as React from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Info,
  Monitor,
  OctagonX,
  ScrollText,
  Search,
  ShieldCheck,
  Smartphone,
  Tablet,
  Timer,
  UserRound,
  Users,
  FilterX,
} from "lucide-react";

import { addDays, todayKey } from "@/lib/calendar-logic";
import type {
  ActivityLogActorRole,
  ActivityLogCategory,
  ActivityLogRow,
  ActivityLogSeverity,
} from "@/lib/types/activity-log";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FloatingSheet,
  FloatingSheetContent,
  FloatingSheetHeader,
  FloatingSheetTitle,
  FloatingSheetDescription,
  FloatingSheetBody,
} from "@/components/ui/floating-sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const SEVERITY_RANK: Record<ActivityLogSeverity, number> = {
  critical: 4,
  error: 3,
  warning: 2,
  info: 1,
  success: 0,
};

const SEVERITY_META: Record<
  ActivityLogSeverity,
  { label: string; badgeVariant: "destructive" | "warning" | "success" | "secondary"; icon: typeof Info }
> = {
  critical: { label: "Crítico", badgeVariant: "destructive", icon: OctagonX },
  error: { label: "Error", badgeVariant: "destructive", icon: AlertOctagon },
  warning: { label: "Advertencia", badgeVariant: "warning", icon: AlertTriangle },
  info: { label: "Info", badgeVariant: "secondary", icon: Info },
  success: { label: "Correcto", badgeVariant: "success", icon: CheckCircle2 },
};

const ROLE_META: Record<ActivityLogActorRole, { label: string; icon: typeof UserRound }> = {
  client: { label: "Cliente", icon: UserRound },
  trainer: { label: "Entrenador", icon: Users },
  superadmin: { label: "Superadmin", icon: ShieldCheck },
  anon: { label: "Sin sesión", icon: UserRound },
};

const CATEGORY_LABELS: Record<ActivityLogCategory, string> = {
  auth: "Autenticación",
  trainer: "Entrenador",
  client: "Cliente",
  superadmin: "Superadmin",
  system: "Sistema",
};

type DateRangeOption =
  | "last30min"
  | "lastHour"
  | "last12h"
  | "lastDay"
  | "today"
  | "week"
  | "month"
  | "all"
  | "custom";

type SortOption = "newest" | "oldest" | "most_critical" | "least_critical";

// Los primeros cuatro son ventanas móviles en minutos (últimos 30 min,
// última hora...), no días de calendario — por eso se calculan aparte,
// contra la marca de tiempo exacta y no contra la fecha del día.
const RECENT_MINUTES_BY_RANGE: Partial<Record<DateRangeOption, number>> = {
  last30min: 30,
  lastHour: 60,
  last12h: 12 * 60,
  lastDay: 24 * 60,
};

const DATE_RANGE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: "last30min", label: "Últimos 30 minutos" },
  { value: "lastHour", label: "Última hora" },
  { value: "last12h", label: "Últimas 12 horas" },
  { value: "lastDay", label: "Último día" },
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "all", label: "Todo el historial" },
  { value: "custom", label: "Rango personalizado" },
];

/** Envuelto aparte (en vez de Date.now() directo dentro del useMemo de
 * abajo) porque el linter de hooks marca una llamada "impura" suelta
 * dentro del cuerpo de un hook — igual que ya pasaba con todayKey(). */
function nowMs(): number {
  return Date.now();
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Más recientes primero" },
  { value: "oldest", label: "Más antiguos primero" },
  { value: "most_critical", label: "Más crítico primero" },
  { value: "least_critical", label: "Correctos primero" },
];

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDayLabel(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
    .toUpperCase()
    .replace(".", "");
}

function formatFull(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function SeverityBadge({ severity }: { severity: ActivityLogSeverity }) {
  const meta = SEVERITY_META[severity];
  const Icon = meta.icon;
  return (
    <Badge variant={meta.badgeVariant}>
      <Icon /> {meta.label}
    </Badge>
  );
}

/**
 * Bitácora de actividad de toda la plataforma — tabla de una línea por
 * evento (estilo el panel de logs de Vercel: hora, estatus, actor,
 * acción) que al hacerle clic abre el detalle completo en un
 * FloatingSheet a la derecha. Los ~1000 eventos más recientes ya vienen
 * del servidor; todo el filtrado/orden/búsqueda de aquí para abajo es
 * en el navegador, igual que el resto del panel de superadmin.
 */
export function ActivityLogsBrowser({ logs }: { logs: ActivityLogRow[] }) {
  const [query, setQuery] = React.useState("");
  const [severity, setSeverity] = React.useState<ActivityLogSeverity | "all">("all");
  const [role, setRole] = React.useState<ActivityLogActorRole | "all">("all");
  const [actorId, setActorId] = React.useState<string | "all">("all");
  const [dateRange, setDateRange] = React.useState<DateRangeOption>("all");
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");
  const [sort, setSort] = React.useState<SortOption>("newest");
  const [selected, setSelected] = React.useState<ActivityLogRow | null>(null);

  const actorOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const log of logs) {
      if (!log.actor_id) continue;
      map.set(log.actor_id, log.actor_name || log.actor_email || "Sin nombre");
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [logs]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const today = todayKey();
    const recentMinutes = RECENT_MINUTES_BY_RANGE[dateRange];
    const recentCutoffMs = recentMinutes !== undefined ? nowMs() - recentMinutes * 60_000 : null;
    const rangeStart =
      dateRange === "today"
        ? today
        : dateRange === "week"
          ? addDays(today, -6)
          : dateRange === "month"
            ? addDays(today, -29)
            : dateRange === "custom" && customFrom
              ? customFrom
              : null;
    const rangeEnd = dateRange === "custom" && customTo ? customTo : today;

    let rows = logs.filter((log) => {
      if (severity !== "all" && log.severity !== severity) return false;
      if (role !== "all" && log.actor_role !== role) return false;
      if (actorId !== "all" && log.actor_id !== actorId) return false;
      if (recentCutoffMs !== null) {
        if (new Date(log.created_at).getTime() < recentCutoffMs) return false;
      } else if (dateRange !== "all" && rangeStart) {
        const day = log.created_at.slice(0, 10);
        if (day < rangeStart || day > rangeEnd) return false;
      }
      if (
        q &&
        !`${log.message} ${log.action} ${log.actor_name ?? ""} ${log.actor_email ?? ""} ${log.target_label ?? ""}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });

    rows = rows.slice().sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.created_at.localeCompare(b.created_at);
        case "most_critical":
          return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.created_at.localeCompare(a.created_at);
        case "least_critical":
          return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.created_at.localeCompare(a.created_at);
        case "newest":
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });

    return rows;
  }, [logs, query, severity, role, actorId, dateRange, customFrom, customTo, sort]);

  const hasActiveFilters =
    query.trim() !== "" ||
    severity !== "all" ||
    role !== "all" ||
    actorId !== "all" ||
    dateRange !== "all";

  function clearFilters() {
    setQuery("");
    setSeverity("all");
    setRole("all");
    setActorId("all");
    setDateRange("all");
    setCustomFrom("");
    setCustomTo("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="relative max-w-sm">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por mensaje, acción, usuario…"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="w-auto min-w-0 whitespace-nowrap">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRangeOption)}>
            <SelectTrigger className="w-auto min-w-0 whitespace-nowrap">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {dateRange === "custom" ? (
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-auto"
              />
              <span className="text-sm text-muted-foreground">a</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-auto"
              />
            </div>
          ) : null}

          <Select value={severity} onValueChange={(v) => setSeverity(v as ActivityLogSeverity | "all")}>
            <SelectTrigger className="w-auto min-w-0 whitespace-nowrap">
              <SelectValue placeholder="Severidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toda severidad</SelectItem>
              {(Object.keys(SEVERITY_META) as ActivityLogSeverity[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SEVERITY_META[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={role} onValueChange={(v) => setRole(v as ActivityLogActorRole | "all")}>
            <SelectTrigger className="w-auto min-w-0 whitespace-nowrap">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              {(Object.keys(ROLE_META) as ActivityLogActorRole[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {ROLE_META[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {actorOptions.length > 0 ? (
            <Select value={actorId} onValueChange={setActorId}>
              <SelectTrigger className="w-auto min-w-0 whitespace-nowrap">
                <SelectValue placeholder="Usuario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los usuarios</SelectItem>
                {actorOptions.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={!hasActiveFilters}
            onClick={clearFilters}
          >
            <FilterX /> Limpiar filtros
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <ScrollText className="size-7" />
            <p className="text-sm">
              {logs.length === 0
                ? "Todavía no hay nada registrado."
                : "Ningún log coincide con la búsqueda o los filtros."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-foreground/[0.02] text-left text-xs text-muted-foreground uppercase">
                  <th className="px-3 py-2 font-medium">Hora</th>
                  <th className="px-3 py-2 font-medium">Severidad</th>
                  <th className="px-3 py-2 font-medium">Actor</th>
                  <th className="px-3 py-2 font-medium">Acción</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const RoleIcon = ROLE_META[log.actor_role].icon;
                  const client = log.context.client as ClientEnvironmentContext | undefined;
                  const DeviceIcon = client?.device ? (DEVICE_ICONS[client.device] ?? Monitor) : null;
                  return (
                    <tr
                      key={log.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-accent/40"
                      onClick={() => setSelected(log)}
                    >
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums text-muted-foreground">
                        <span className="mr-1.5 text-xs text-muted-foreground/70">
                          {formatDayLabel(log.created_at)}
                        </span>
                        {formatTime(log.created_at)}
                      </td>
                      <td className="px-3 py-2">
                        <SeverityBadge severity={log.severity} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <RoleIcon className="size-3.5 shrink-0 text-muted-foreground" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {log.actor_name || log.actor_email || ROLE_META[log.actor_role].label}
                            </p>
                          </div>
                          {DeviceIcon ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DeviceIcon className="size-3.5 shrink-0 text-muted-foreground/60" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <div className="flex flex-col gap-0.5 text-center">
                                  <span className="font-semibold">{client?.device}</span>
                                  <span className="text-background/70">
                                    {client?.os} · {client?.browser}
                                  </span>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{log.action}</td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        <span className="line-clamp-1">{log.message}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            {filtered.length} de {logs.length}
          </p>
        </>
      )}

      <FloatingSheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <FloatingSheetContent>
          <FloatingSheetHeader>
            <FloatingSheetTitle>{selected?.message}</FloatingSheetTitle>
            <FloatingSheetDescription>
              {selected ? formatFull(selected.created_at) : ""}
            </FloatingSheetDescription>
          </FloatingSheetHeader>
          <FloatingSheetBody>
            {selected ? <ActivityLogDetail log={selected} /> : null}
          </FloatingSheetBody>
        </FloatingSheetContent>
      </FloatingSheet>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  Escritorio: Monitor,
  Móvil: Smartphone,
  Tablet: Tablet,
};

interface ClientEnvironmentContext {
  browser?: string;
  os?: string;
  device?: string;
  userAgent?: string;
}

function ActivityLogDetail({ log }: { log: ActivityLogRow }) {
  const RoleIcon = ROLE_META[log.actor_role].icon;

  // "client" y "durationMs" se muestran aparte, ya traducidos — el
  // resto del contexto (lo específico de cada acción: flujo, motivo del
  // error, a qué se le hizo clic…) se queda en el JSON de abajo.
  const client = log.context.client as ClientEnvironmentContext | undefined;
  const durationMs = log.context.durationMs as number | undefined;
  const restContext = Object.fromEntries(
    Object.entries(log.context).filter(([key]) => key !== "client" && key !== "durationMs"),
  );
  const hasContext = Object.keys(restContext).length > 0;
  const DeviceIcon = client?.device ? (DEVICE_ICONS[client.device] ?? Monitor) : Monitor;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <SeverityBadge severity={log.severity} />
        <Badge variant="outline">{CATEGORY_LABELS[log.category]}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 border-b pb-4">
        <DetailRow label="Fecha y hora">{formatFull(log.created_at)}</DetailRow>
        <DetailRow label="Acción">
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{log.action}</code>
        </DetailRow>
        <DetailRow label="Quién">
          <div className="flex items-center gap-1.5">
            <RoleIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span>{log.actor_name || "—"}</span>
          </div>
        </DetailRow>
        <DetailRow label="Rol">{ROLE_META[log.actor_role].label}</DetailRow>
        <DetailRow label="Correo">{log.actor_email || "—"}</DetailRow>
        <DetailRow label="ID de usuario">
          <code className="text-xs text-muted-foreground">{log.actor_id || "—"}</code>
        </DetailRow>
      </div>

      {log.target_type || log.target_label ? (
        <div className="border-b pb-4">
          <DetailRow label="Sobre qué actuó">
            {log.target_label || "—"}
            {log.target_type ? (
              <span className="ml-1.5 text-xs text-muted-foreground">({log.target_type})</span>
            ) : null}
          </DetailRow>
        </div>
      ) : null}

      {client || durationMs !== undefined ? (
        <div className="grid grid-cols-2 gap-4 border-b pb-4">
          {client ? (
            <>
              <DetailRow label="Navegador">{client.browser || "—"}</DetailRow>
              <DetailRow label="Sistema operativo">{client.os || "—"}</DetailRow>
              <DetailRow label="Dispositivo">
                <div className="flex items-center gap-1.5">
                  <DeviceIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span>{client.device || "—"}</span>
                </div>
              </DetailRow>
            </>
          ) : null}
          {durationMs !== undefined ? (
            <DetailRow label="Duración de la acción">
              <div className="flex items-center gap-1.5 tabular-nums">
                <Timer className="size-3.5 shrink-0 text-muted-foreground" />
                <span>{durationMs < 1000 ? `${durationMs} ms` : `${(durationMs / 1000).toFixed(2)} s`}</span>
              </div>
            </DetailRow>
          ) : null}
        </div>
      ) : null}

      {client?.userAgent ? (
        <div className="border-b pb-4">
          <DetailRow label="User agent completo">
            <span className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <Globe className="mt-0.5 size-3.5 shrink-0" />
              <span className="break-all">{client.userAgent}</span>
            </span>
          </DetailRow>
        </div>
      ) : null}

      <div className="border-b pb-4">
        <DetailRow label="Mensaje">{log.message}</DetailRow>
      </div>

      {hasContext ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Detalle técnico (flujo, clic, estatus, motivo del error…)
          </p>
          <pre className="overflow-x-auto rounded-xl border bg-muted/40 p-3 text-xs">
            {JSON.stringify(restContext, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
