import { CalendarX, Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { initialsOf } from "@/lib/format";
import type { CalendarSession } from "@/lib/calendar-logic";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ClientDaySessions {
  clientId: string;
  clientName: string;
  programNames: string[];
  routines: { routineId: string; routineName: string; date: string; isCustomizedForClient?: boolean }[];
}

/** Agrupa las sesiones del día por cliente — un programa con más de una
 * rutina el mismo día (ej. cardio + tren superior) generaba una tarjeta
 * repetida por cada rutina; ahora es una sola tarjeta por cliente con
 * todas sus rutinas de ese día enlistadas. */
function groupByClient(sessions: CalendarSession[]): ClientDaySessions[] {
  const order: string[] = [];
  const byClient = new Map<string, ClientDaySessions>();
  for (const session of sessions) {
    let entry = byClient.get(session.clientId);
    if (!entry) {
      entry = { clientId: session.clientId, clientName: session.clientName, programNames: [], routines: [] };
      byClient.set(session.clientId, entry);
      order.push(session.clientId);
    }
    if (session.isProgram && session.programName && !entry.programNames.includes(session.programName)) {
      entry.programNames.push(session.programName);
    }
    entry.routines.push({
      routineId: session.routineId,
      routineName: session.routineName,
      date: session.date,
      isCustomizedForClient: session.isCustomizedForClient,
    });
  }
  return order.map((id) => byClient.get(id)!);
}

export function CalendarSessionList({
  sessions,
  completedKeys,
}: {
  sessions: CalendarSession[];
  completedKeys: Set<string>;
}) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
        <CalendarX className="size-8" />
        <p className="text-sm">Ningún cliente tiene sesión este día.</p>
      </div>
    );
  }

  const clients = groupByClient(sessions);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {clients.map((client) => (
        <Card
          key={client.clientId}
          className="h-full card-hover-glow transition-colors hover:border-primary/40"
        >
          <CardContent className="flex h-full flex-col gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-10 shrink-0">
                <AvatarFallback>{initialsOf(client.clientName) || "?"}</AvatarFallback>
              </Avatar>
              <p className="truncate text-sm font-semibold">{client.clientName}</p>
            </div>

            <div className="mt-auto flex flex-col gap-1.5">
              {client.routines.map((routine, index) => {
                const isCompleted = completedKeys.has(
                  `${client.clientId}|${routine.date}|${routine.routineId}`,
                );
                return (
                  <div key={`${routine.routineId}-${index}`} className="flex items-center gap-1.5">
                    <p
                      className={cn(
                        "truncate text-xs",
                        isCompleted ? "font-medium text-success" : "text-muted-foreground",
                      )}
                    >
                      {routine.routineName}
                    </p>
                    {isCompleted && <Check className="size-3.5 shrink-0 text-success" />}
                    {routine.isCustomizedForClient && (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        Personalizado
                      </Badge>
                    )}
                  </div>
                );
              })}
              {client.programNames.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {client.programNames.map((name) => (
                    <Badge key={name} variant="secondary">
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
