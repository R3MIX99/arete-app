/** `49900, "MXN"` → "$499.00". Los precios de los planes se guardan en
 * centavos para no arrastrar errores de redondeo. */
export function formatMoney(cents: number, currency = "MXN"): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(cents / 100);
}

export function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export const clientGoalLabels: Record<string, string> = {
  lose_weight: "Perder peso",
  gain_muscle: "Ganar músculo",
  maintenance: "Mantenimiento",
  performance: "Rendimiento",
};

export function goalLabel(goal: string | null): string | null {
  if (!goal) return null;
  return clientGoalLabels[goal] ?? goal;
}

export const genderLabels: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  unspecified: "Sin especificar",
};

export function genderLabel(gender: string | null): string {
  if (!gender) return genderLabels.unspecified;
  return genderLabels[gender] ?? genderLabels.unspecified;
}

export const routineLevelLabels: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

export function levelLabel(level: string): string {
  return routineLevelLabels[level] ?? level;
}

export const muscleGroupLabels: Record<string, string> = {
  chest: "Pecho",
  back: "Espalda",
  shoulders: "Hombros",
  arms: "Brazos",
  legs: "Piernas",
  core: "Core",
  cardio: "Cardio",
  full_body: "Cuerpo completo",
};

export function muscleGroupLabel(value: string): string {
  return muscleGroupLabels[value] ?? value;
}

export const equipmentLabels: Record<string, string> = {
  bodyweight: "Peso corporal",
  barbell: "Barra",
  dumbbell: "Mancuernas",
  machine: "Máquina",
  cable: "Polea",
  kettlebell: "Kettlebell",
  resistance_band: "Banda de resistencia",
  bench: "Banco",
  other: "Otro",
};

export function equipmentLabel(value: string): string {
  return equipmentLabels[value] ?? value;
}

/** ISO 8601: 1 = lunes ... 7 = domingo. */
export const weekdayLabels: Record<number, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  7: "Domingo",
};

export function weekdayLabel(value: number): string {
  return weekdayLabels[value] ?? String(value);
}

export const mealTypeLabels: Record<string, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snack",
};

export function mealTypeLabel(value: string): string {
  return mealTypeLabels[value] ?? value;
}

export function formatGrams(value: number): string {
  return `${Math.round(value)} g`;
}

export function formatKcal(value: number): string {
  return `${Math.round(value)} kcal`;
}

export function householdMeasureFor(
  grams: number,
  unitName: string | null,
  unitGrams: number | null,
): string | null {
  if (!unitName || !unitGrams) return null;
  const count = Math.round((grams / unitGrams) * 4) / 4;
  const formatted = Number.isInteger(count) ? String(count) : count.toFixed(2);
  return `${formatted} ${unitName}`;
}

export function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Para timestamps completos (con hora), a diferencia de formatDate que
 * espera un 'YYYY-MM-DD' suelto. */
export function formatDateTime(value: string): string {
  return new Date(value).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** 'YYYY-MM-DD' → "Miércoles, 12 de agosto". */
export function formatDayHeading(key: string): string {
  const label = new Date(`${key}T00:00:00`).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** year, month(1-12) → "Agosto 2026". */
export function formatMonthYear(year: number, month: number): string {
  const label = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}
