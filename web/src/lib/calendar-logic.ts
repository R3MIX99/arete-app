/**
 * Cálculo de sesiones concretas de calendario a partir de las
 * asignaciones (programas y rutinas sueltas) de un entrenador — puerto
 * a TypeScript de `app/lib/features/trainer/domain/calendar_logic.dart`.
 *
 * Todas las fechas se manejan como llaves 'YYYY-MM-DD' (sin hora) para
 * no depender de la zona horaria del navegador en la aritmética.
 */

export interface CalendarProgramSlot {
  programRoutineId: string;
  weekNumber: number;
  dayOfWeek: number; // ISO: 1 = lunes ... 7 = domingo
  routineName: string;
}

export interface CalendarAssignment {
  assignmentId: string;
  clientId: string;
  clientName: string;
  startDate: string; // 'YYYY-MM-DD'
  isProgram: boolean;
  programName?: string | null;
  programDurationWeeks?: number | null;
  standaloneRoutineName?: string | null;
  slots: CalendarProgramSlot[];
  overridesByProgramRoutineId: Record<string, string>;
}

export interface CalendarSession {
  date: string; // 'YYYY-MM-DD'
  assignmentId: string;
  clientId: string;
  clientName: string;
  routineName: string;
  isProgram: boolean;
  programName?: string | null;
  isCustomizedForClient?: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toKey(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function todayKey(): string {
  const now = new Date();
  return toKey(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** ISO weekday: 1 = lunes ... 7 = domingo. */
export function weekdayIso(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  const utcDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = domingo
  return utcDay === 0 ? 7 : utcDay;
}

export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return toKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function mondayOfWeek(key: string): string {
  return addDays(key, -(weekdayIso(key) - 1));
}

export function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Sesiones concretas que caen dentro de [rangeStart, rangeEndInclusive]
 * (ambos incluidos).
 *
 * - Programa: la semana 1 arranca el lunes de la semana en la que cae
 *   `start_date`, y se repite por cada semana hasta `duration_weeks`. Si
 *   el cliente tiene un ajuste puntual (`assignment_overrides`) para esa
 *   casilla, se muestra la rutina de reemplazo.
 * - Rutina suelta: se repite semana a semana en el mismo día de la
 *   semana que `start_date`, sin fecha de fin.
 */
export function sessionsInRange(
  assignments: CalendarAssignment[],
  rangeStart: string,
  rangeEndInclusive: string,
): CalendarSession[] {
  const sessions: CalendarSession[] = [];

  for (const assignment of assignments) {
    if (assignment.isProgram) {
      const durationWeeks = assignment.programDurationWeeks ?? 0;
      const week1Start = mondayOfWeek(assignment.startDate);
      const programEndExclusive = addDays(week1Start, durationWeeks * 7);

      for (const slot of assignment.slots) {
        const date = addDays(
          week1Start,
          (slot.weekNumber - 1) * 7 + (slot.dayOfWeek - 1),
        );
        if (compareKeys(date, rangeStart) < 0 || compareKeys(date, rangeEndInclusive) > 0) {
          continue;
        }
        if (compareKeys(date, programEndExclusive) >= 0) continue;

        const override = assignment.overridesByProgramRoutineId[slot.programRoutineId];
        sessions.push({
          date,
          assignmentId: assignment.assignmentId,
          clientId: assignment.clientId,
          clientName: assignment.clientName,
          routineName: override ?? slot.routineName,
          isProgram: true,
          programName: assignment.programName,
          isCustomizedForClient: Boolean(override),
        });
      }
    } else {
      const routineName = assignment.standaloneRoutineName;
      if (!routineName) continue;

      const assignmentStart = assignment.startDate;
      const weekday = weekdayIso(assignmentStart);
      let date = addDays(rangeStart, (weekday - weekdayIso(rangeStart) + 7) % 7);
      while (compareKeys(date, rangeEndInclusive) <= 0) {
        if (compareKeys(date, assignmentStart) >= 0) {
          sessions.push({
            date,
            assignmentId: assignment.assignmentId,
            clientId: assignment.clientId,
            clientName: assignment.clientName,
            routineName,
            isProgram: false,
          });
        }
        date = addDays(date, 7);
      }
    }
  }

  sessions.sort((a, b) => compareKeys(a.date, b.date));
  return sessions;
}

export function groupSessionsByDate(
  sessions: CalendarSession[],
): Map<string, CalendarSession[]> {
  const map = new Map<string, CalendarSession[]>();
  for (const session of sessions) {
    const list = map.get(session.date) ?? [];
    list.push(session);
    map.set(session.date, list);
  }
  return map;
}
