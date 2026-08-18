"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck } from "lucide-react";

import { superadminNavItems } from "@/lib/nav-items";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SidebarProfileFooter } from "@/components/trainer/sidebar-profile-footer";
import { ThemePicker } from "@/components/theme-picker";

function isActive(pathname: string, href: string) {
  return href === "/superadmin" ? pathname === "/superadmin" : pathname.startsWith(href);
}

/**
 * Marco del panel de superadministrador: barra lateral en escritorio,
 * drawer en teléfono. Es más simple que la del entrenador (tres
 * secciones, sin colapsar) pero comparte el estilo `.sidebar-panel` y el
 * pie de perfil, para que se sienta la misma app.
 */
export function SuperadminShell({
  userName,
  userEmail,
  children,
}: {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const title = superadminNavItems.find((item) => isActive(pathname, item.href))?.label ?? "Aretia";

  const navList = (onNavigate?: () => void) => (
    <ul className="flex flex-col gap-1.5">
      {superadminNavItems.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
              style={{
                color: active ? "var(--sb-text)" : "var(--sb-text-secondary)",
                background: active ? "var(--sb-active)" : "transparent",
              }}
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  const brand = (
    <div className="flex items-center gap-2.5" style={{ color: "var(--sb-text)" }}>
      <div
        className="flex size-8 items-center justify-center rounded-lg"
        style={{ background: "linear-gradient(135deg, var(--sb-accent-start), var(--sb-accent-end))" }}
      >
        <ShieldCheck className="size-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">Aretia</p>
        <p className="truncate text-[11px]" style={{ color: "var(--sb-text-muted)" }}>
          Superadministrador
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <aside
        className={cn("sidebar-panel hidden h-screen w-64 shrink-0 flex-col border-r md:flex")}
        style={{ borderColor: "var(--sb-border-dim)" }}
      >
        <div className="border-b px-4 py-3.5" style={{ borderColor: "var(--sb-border-dim)" }}>
          {brand}
        </div>
        <nav className="flex-1 overflow-y-auto px-2.5 py-3">{navList()}</nav>
        <div className="border-t" style={{ borderColor: "var(--sb-border-dim)" }}>
          <SidebarProfileFooter userName={userName} userEmail={userEmail} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sidebar-panel flex w-72 flex-col border-r-0 p-0">
              <SheetHeader className="border-b" style={{ borderColor: "var(--sb-border-dim)" }}>
                <SheetTitle asChild>{brand}</SheetTitle>
              </SheetHeader>
              <nav className="flex-1 overflow-y-auto px-2.5 py-3">
                {navList(() => setMenuOpen(false))}
              </nav>
              <div className="border-t" style={{ borderColor: "var(--sb-border-dim)" }}>
                <SidebarProfileFooter
                  userName={userName}
                  userEmail={userEmail}
                  showTooltips={false}
                />
              </div>
            </SheetContent>
          </Sheet>

          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</p>
          <ThemePicker />
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
