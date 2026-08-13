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
    <div className="flex flex-col gap-2">
      {sessions.map((session, index) => (
        <Card key={`${session.assignmentId}-${index}`}>
          <CardContent className="flex items-center gap-3">
            <Avatar className="size-9 shrink-0">
              <AvatarFallback className="text-xs">
                {initialsOf(session.clientName) || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{session.clientName}</p>
              <p className="truncate text-xs text-muted-foreground">{session.routineName}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {session.isProgram && session.programName && (
                <Badge variant="secondary" className="text-[10px]">
                  {session.programName}
                </Badge>
              )}
              {session.isCustomizedForClient && (
                <Badge variant="outline" className="text-[10px]">
                  Personalizado
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
