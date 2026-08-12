import {
  LayoutDashboard,
  Users,
  Dumbbell,
  CalendarRange,
  ClipboardList,
  Apple,
  Calendar,
  LineChart,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** Los 9 módulos del panel de entrenador — mismo orden que en Flutter. */
export const trainerNavItems: NavItem[] = [
  { href: "/entrenador", label: "Dashboard", icon: LayoutDashboard },
  { href: "/entrenador/clientes", label: "Clientes", icon: Users },
  { href: "/entrenador/ejercicios", label: "Biblioteca de Ejercicios", icon: Dumbbell },
  { href: "/entrenador/rutinas", label: "Rutinas", icon: ClipboardList },
  { href: "/entrenador/programas", label: "Programas", icon: CalendarRange },
  { href: "/entrenador/nutricion", label: "Planes Nutricionales", icon: Apple },
  { href: "/entrenador/calendario", label: "Calendario", icon: Calendar },
  { href: "/entrenador/progreso", label: "Seguimiento de Progreso", icon: LineChart },
  { href: "/entrenador/configuracion", label: "Configuración", icon: Settings },
];
