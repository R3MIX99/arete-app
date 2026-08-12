"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Dumbbell } from "lucide-react";

import { trainerNavItems } from "@/lib/nav-items";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarProfileFooter } from "@/components/trainer/sidebar-profile-footer";

export function MobileNav({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="sidebar-dark w-72 p-0 border-r-0 flex flex-col">
        <SheetHeader className="border-b" style={{ borderColor: "var(--sb-border-dim)" }}>
          <SheetTitle asChild>
            <div className="flex items-center gap-2.5" style={{ color: "var(--sb-text)" }}>
              <div
                className="flex size-8 items-center justify-center rounded-lg"
                style={{
                  background:
                    "linear-gradient(135deg, var(--sb-accent-start), var(--sb-accent-end))",
                }}
              >
                <Dumbbell className="size-4 text-white" />
              </div>
              <span className="text-sm font-semibold">Areté</span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3">
          <ul className="flex flex-col gap-1.5">
            {trainerNavItems.map((item) => {
              const active =
                item.href === "/entrenador"
                  ? pathname === "/entrenador"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium"
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
        </nav>

        <div className="border-t" style={{ borderColor: "var(--sb-border-dim)" }}>
          <SidebarProfileFooter userName={userName} userEmail={userEmail} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
