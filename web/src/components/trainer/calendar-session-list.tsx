import { CalendarX } from "lucide-react";

import { initialsOf } from "@/lib/format";
import type { CalendarSession } from "@/lib/calendar-logic";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function CalendarSessionList({ sessions }: { sessions: CalendarSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
        <CalendarX className="size-8" />
        <p className="text-sm">Ningún cliente tiene sesión este día.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {sessions.map((session, index) => (
        <Card
          key={`${session.assignmentId}-${index}`}
          className="h-full card-hover-glow transition-colors hover:border-primary/40"
        >
          <CardContent className="flex h-full flex-col gap-3">
            <div className="flex items-start justify-between">
              <Avatar className="size-10">
                <AvatarFallback>{initialsOf(session.clientName) || "?"}</AvatarFallback>
              </Avatar>
              {session.isCustomizedForClient && (
                <Badge variant="outline" className="text-[10px]">
                  Personalizado
                </Badge>
              )}
            </div>
            <div className="mt-auto">
              <p className="truncate text-sm font-semibold">{session.clientName}</p>
              <p className="truncate text-xs text-muted-foreground">{session.routineName}</p>
              {session.isProgram && session.programName && (
                <Badge variant="secondary" className="mt-2">
                  {session.programName}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
