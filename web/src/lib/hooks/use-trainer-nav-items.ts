import { Users2 } from "lucide-react";

import { trainerNavItems, type NavItem } from "@/lib/nav-items";
import { useGymContext } from "@/components/trainer/gym-context";

/** trainerNavItems + "Equipo" insertado justo después de "Clientes",
 *  solo si el entrenador actual pertenece a un gimnasio — un entrenador
 *  independiente nunca ve esta pestaña. La usan SidebarNav, TopBar y
 *  MobileNav para no triplicar la misma lógica de inserción. */
export function useTrainerNavItems(): NavItem[] {
  const gym = useGymContext();
  if (!gym) return trainerNavItems;

  const items = [...trainerNavItems];
  const clientsIndex = items.findIndex((item) => item.href === "/entrenador/clientes");
  const teamItem: NavItem = { href: "/entrenador/equipo", label: "Equipo", icon: Users2 };
  items.splice(clientsIndex + 1, 0, teamItem);
  return items;
}
