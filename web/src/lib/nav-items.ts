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
  Home,
  User,
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

/** Las 5 pestañas del panel de cliente (Fase 9/10/11). */
export const clientNavItems: NavItem[] = [
  { href: "/cliente", label: "Inicio", icon: Home },
  { href: "/cliente/agenda", label: "Agenda", icon: Calendar },
  { href: "/cliente/entrenamiento", label: "Historial", icon: Dumbbell },
  { href: "/cliente/nutricion", label: "Nutrición", icon: Apple },
  { href: "/cliente/perfil", label: "Perfil", icon: User },
];
