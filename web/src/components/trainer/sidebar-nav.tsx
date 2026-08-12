"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, Dumbbell } from "lucide-react";

import { trainerNavItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SidebarProfileFooter } from "@/components/trainer/sidebar-profile-footer";

/**
 * Barra lateral de escritorio: siempre oscura (ver `.sidebar-dark` en
 * globals.css), colapsable a solo íconos cuadrados. El ítem activo se
 * marca con una franja de luz pegada al borde derecho (expandida) o un
 * degradé diagonal (colapsada); el perfil y cerrar sesión viven abajo.
 */
export function SidebarNav({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <aside
      className="sidebar-dark hidden md:flex h-screen flex-col shrink-0 border-r"
      style={{
        borderColor: "var(--sb-border-dim)",
        width: collapsed ? 76 : 256,
        minWidth: collapsed ? 76 : 256,
        maxWidth: collapsed ? 76 : 256,
        transition: "width 200ms ease, min-width 200ms ease, max-width 200ms ease",
      }}
    >
      {/* Encabezado: logo + nombre + colapsar, todo en la misma fila. */}
      <div
        className="flex h-16 items-center border-b px-3"
        style={{ borderColor: "var(--sb-border-dim)" }}
      >
        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-2.5 px-1">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
              style={{
                background:
                  "linear-gradient(135deg, var(--sb-accent-start), var(--sb-accent-end))",
              }}
            >
              <Dumbbell className="size-4 text-white" />
            </div>
            <span className="truncate text-sm font-semibold tracking-tight">
              Areté
            </span>
          </div>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                collapsed && "mx-auto",
              )}
              style={{ color: "var(--sb-text-muted)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--sb-hover)";
                e.currentTarget.style.color = "var(--sb-text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--sb-text-muted)";
              }}
            >
              {collapsed ? (
                <ChevronsRight className="size-4" />
              ) : (
                <ChevronsLeft className="size-4" />
              )}
            </button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">Expandir barra lateral</TooltipContent>
          )}
        </Tooltip>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className={cn("flex flex-col", collapsed ? "gap-3" : "gap-2.5")}>
          {trainerNavItems.map((item) => {
            const active =
              item.href === "/entrenador"
                ? pathname === "/entrenador"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            const link = (
              <Link
                href={item.href}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                  collapsed ? "size-11 justify-center mx-auto" : "px-2.5 py-2",
                )}
                style={
                  collapsed
                    ? {
                        color: active ? "#fff" : "var(--sb-text-secondary)",
                        background: active
                          ? "linear-gradient(135deg, var(--sb-accent-start), var(--sb-bg))"
                          : "transparent",
                      }
                    : {
                        color: active ? "var(--sb-text)" : "var(--sb-text-secondary)",
                        background: active ? "var(--sb-active)" : "transparent",
                      }
                }
                onMouseEnter={(e) => {
                  if (active) return;
                  e.currentTarget.style.background = "var(--sb-hover)";
                }}
                onMouseLeave={(e) => {
                  if (active) return;
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <Icon className="size-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {active && !collapsed && (
                  <span
                    className="absolute right-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
                    style={{
                      background:
                        "linear-gradient(to bottom, var(--sb-accent-start), var(--sb-accent-end))",
                      boxShadow: "0 0 8px 0 var(--sb-accent-start)",
                    }}
                  />
                )}
              </Link>
            );

            return (
              <li key={item.href}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t" style={{ borderColor: "var(--sb-border-dim)" }}>
        <SidebarProfileFooter
          userName={userName}
          userEmail={userEmail}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}
