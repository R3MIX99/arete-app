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
