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
