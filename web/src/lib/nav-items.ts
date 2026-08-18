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
  UserRound,
  Library,
  Sparkles,
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

/** Panel de superadministrador (Fase 12): vista global de la
 * plataforma, en solo lectura por ahora. */
export const superadminNavItems: NavItem[] = [
  { href: "/superadmin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/entrenadores", label: "Entrenadores", icon: Users },
  { href: "/superadmin/clientes", label: "Clientes", icon: UserRound },
  { href: "/superadmin/biblioteca", label: "Biblioteca de Aretia", icon: Library },
  { href: "/superadmin/ia", label: "Sección IA", icon: Sparkles },
];

/** Las 4 pestañas del panel de cliente. El perfil ya no vive aquí: se
 * abre desde el avatar de la barra superior, y así la nav queda más
 * compacta y centrada. */
export const clientNavItems: NavItem[] = [
  { href: "/cliente", label: "Inicio", icon: Home },
  { href: "/cliente/agenda", label: "Agenda", icon: Calendar },
  // Gráfica y no pesa: la pesa daba a entender que ahí se entrena,
  // cuando lo que hay es el historial y la evolución.
  { href: "/cliente/entrenamiento", label: "Historial", icon: LineChart },
  { href: "/cliente/nutricion", label: "Nutrición", icon: Apple },
];
