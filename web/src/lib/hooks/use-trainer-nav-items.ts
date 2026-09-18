import { Network } from "lucide-react";

import { trainerNavItems, type NavItem } from "@/lib/nav-items";
import { useGymContext } from "@/components/trainer/gym-context";

/** trainerNavItems + "Equipo" insertado justo después de "Clientes",
 *  solo si el entrenador actual pertenece a un gimnasio Y es admin o
 *  supervisor — un entrenador/nutriólogo/asistente normal solo ve a
 *  sus propios clientes, no la pestaña de gestión del equipo (matriz
 *  de permisos de la Fase D: invitar/cambiar roles/reasignar es cosa
 *  de admin/supervisor). La usan SidebarNav, TopBar y MobileNav para
 *  no triplicar la misma lógica de inserción. */
export function useTrainerNavItems(): NavItem[] {
  const gym = useGymContext();
  if (!gym || !gym.isManager) return trainerNavItems;

  const items = [...trainerNavItems];
  const clientsIndex = items.findIndex((item) => item.href === "/entrenador/clientes");
  const teamItem: NavItem = { href: "/entrenador/equipo", label: "Equipo", icon: Network };
  items.splice(clientsIndex + 1, 0, teamItem);
  return items;
}
